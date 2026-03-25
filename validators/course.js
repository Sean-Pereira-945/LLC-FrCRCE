const Joi = require('joi');

const categoryValues = [
  'Technical',
  'Non-technical',
  'Self-Development',
  'Extra-curricular'
];

const createCourseSchema = Joi.object({
  courseName: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(1000).required(),
  schedule: Joi.string().trim().max(255).required(),
  capacity: Joi.number().integer().min(1).max(500).required(),
  category: Joi.string().valid(...categoryValues).required(),
  logoUrl: Joi.string().trim().uri().allow('').optional()
});

const updateCourseSchema = Joi.object({
  courseName: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().max(1000).required(),
  schedule: Joi.string().trim().max(255).required(),
  capacity: Joi.number().integer().min(1).max(500).required(),
  category: Joi.string().valid(...categoryValues).optional(),
  logoUrl: Joi.string().trim().uri().allow('').optional()
});

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  categoryValues
};
