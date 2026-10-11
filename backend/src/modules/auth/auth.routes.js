import { Router } from "express";
import validate from "../../middlewares/validate.middleware.js";
import { register, login } from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.schema.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);


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
