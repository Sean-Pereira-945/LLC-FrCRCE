const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      return res.status(400).json({
        error: error.details.map((detail) => detail.message).join(', ')
      });
    }

    req.body = value;
    next();
  };
};

module.exports = validate;
