const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  userType: Joi.string().valid('student', 'teacher').required()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(128).required(),
  userType: Joi.string().valid('student', 'teacher').required()
});

module.exports = {
  registerSchema,
  loginSchema
};
