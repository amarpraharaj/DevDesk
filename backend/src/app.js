import express from "express";
import errorMiddleware from "./middlewares/error.middleware.js";
import healthRouter from "./routes/health.routes.js";

const app = express();

app.use(express.json());

app.use("/api", healthRouter);

app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: "The requested resource was not found.",
    });
});

app.use(errorMiddleware);

export default app;
