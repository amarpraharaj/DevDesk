import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../users/user.model.js";
import { sendPasswordResetEmail } from "./email.service.js";
import { randomBytes, createHash } from "node:crypto";

export const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.validatedBody;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            passwordHash,
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                },
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        return next(error);
    }
};


export const login = async (req, res, next) => {
    try {
        const { email, password } = req.validatedBody;

        const user = await User.findOne({ email }).select("+passwordHash");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const token = jwt.sign(
            { sub: user._id.toString() },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h",
                algorithm: "HS256",
            }
        );

        res.cookie("accessToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 1000,
            path: "/",
        });

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    } catch (error) {
        return next(error);
    }
};



export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.validatedBody;

        const user = await User.findOne({ email });

        if (user) {
            const resetToken = randomBytes(32).toString("hex");

            user.resetPasswordTokenHash = createHash("sha256")
                .update(resetToken)
                .digest("hex");

            user.resetPasswordExpiresAt = new Date(
                Date.now() + 15 * 60 * 1000
            );

            await user.save();

            const resetUrl = new URL(
                "/reset-password",
                process.env.FRONTEND_URL || "http://localhost:5173"
            );

            resetUrl.searchParams.set("token", resetToken);

            await sendPasswordResetEmail(
                user.email,
                resetUrl.toString()
            );
        }

        return res.status(200).json({
            success: true,
            message:
                "If an account exists with that email, password reset instructions will be sent.",
        });
    } catch (error) {
        return next(error);
    }
};



export const resetPassword = async (req, res, next) => {
    try {
        const { token, password } = req.validatedBody;

        const tokenHash = createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            resetPasswordTokenHash: tokenHash,
            resetPasswordExpiresAt: { $gt: new Date() },
        }).select("+resetPasswordTokenHash +resetPasswordExpiresAt");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Reset token is invalid or has expired.",
            });
        }

        user.passwordHash = await bcrypt.hash(password, 12);
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpiresAt = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully. Please log in again.",
        });
    } catch (error) {
        return next(error);
    }
};
