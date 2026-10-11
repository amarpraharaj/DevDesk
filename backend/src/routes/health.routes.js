
import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

// Liveness: the application is responding.
router.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Service is healthy.",
    });
});

// Readiness: required database connection is available.
router.get("/ready", (req, res) => {
    const isDatabaseReady = mongoose.connection.readyState === 1;

    if (!isDatabaseReady) {
        return res.status(503).json({
            success: false,
            message: "Service is not ready.",
        });
    }

    return res.status(200).json({
        success: true,
        message: "Service is ready.",
    });
});

export default router;
