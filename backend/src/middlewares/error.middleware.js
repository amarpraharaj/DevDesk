
const errorMiddleware = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message:
            statusCode >= 500
                ? "An unexpected error occurred."
                : err.message,
    });
};

export default errorMiddleware;
