import express from "express";
import cors from "cors";
import errorMiddleware from "./middlewares/error.middleware.js";
import healthRouter from "./routes/health.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import ticketRouter from "./modules/tickets/ticket.routes.js";
import activityRouter from "./modules/activities/activity.routes.js";
const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api", healthRouter);

app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketRouter);
app.use("/api/activities", activityRouter);

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "The requested resource was not found.",
    });
});

app.use(errorMiddleware);

export default app;
