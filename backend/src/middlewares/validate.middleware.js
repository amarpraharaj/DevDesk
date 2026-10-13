
const validate = (schema, source = "body") => (req, res, next) => {
  const input = source === "query" ? req.query : req.body;
  const result = schema.safeParse(input);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (source === "query") {
    req.validatedQuery = result.data;
  } else {
    req.validatedBody = result.data;
  }

  next();
};

export default validate;
