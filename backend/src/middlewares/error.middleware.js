
const errorMiddleware = (err, req, res, next) => {
    console.error(err);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 500
                ? "An unexpected error occurred."
                : err.message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};

export default errorMiddleware;
