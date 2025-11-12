import Joi from 'joi';

export const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
});

export const loginSchema = Joi.object({
  username: Joi.string().required(), // email or phone
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional()
});

export const verifyCodeSchema = Joi.object({
  code: Joi.string().length(6).required(),
  type: Joi.string().valid('EMAIL_VERIFICATION', 'PHONE_VERIFICATION').required()
});

export const createPinSchema = Joi.object({
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});