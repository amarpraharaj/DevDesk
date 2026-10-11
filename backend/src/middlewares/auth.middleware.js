
import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }


        let decoded;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"],
            });
        } catch (error) {
            if (
                error instanceof jwt.JsonWebTokenError ||
                error instanceof jwt.TokenExpiredError
            ) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid or expired authentication token.",
                });
            }

            return next(error);
        }

        const user = await User.findById(decoded.sub);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found.",
            });
        }

        req.user = user;
        return next();

    } catch (error) {
        return next(error);
    }
};

export default authMiddleware;
