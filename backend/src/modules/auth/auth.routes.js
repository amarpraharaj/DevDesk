import { Router } from "express";

import validate from "../../middlewares/validate.middleware.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

import {
    register,
    login,
    forgotPassword,
    resetPassword,
} from "./auth.controller.js";

import {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "./auth.schema.js";

const router = Router();

// Register
router.post(
    "/register",
    validate(registerSchema),
    register
);

// Login
router.post(
    "/login",
    validate(loginSchema),
    login
);

// Forgot password
router.post(
    "/forgot-password",
    validate(forgotPasswordSchema),
    forgotPassword
);

// Reset password
router.post(
    "/reset-password",
    validate(resetPasswordSchema),
    resetPassword
);

// Get current authenticated user
router.get("/me", authMiddleware, (req, res) => {
    return res.status(200).json({
        success: true,
        data: {
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
            },
        },
    });
});

// Logout
router.post("/logout", (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
    });

    return res.status(200).json({
        success: true,
        message: "Logout successful.",
    });
});

export default router;