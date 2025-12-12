import Joi from 'joi';

export const signupSchema = Joi.object({
  email: Joi.string().email().required(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  password: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  role: Joi.string().valid('PASSENGER', 'DRIVER', 'AGENT', 'PARK_MANAGER').optional().default('PASSENGER')
});

export const loginSchema = Joi.object({
  username: Joi.string().required(), // email or phone
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional()
});

export const verifyCodeSchema = Joi.object({
  code: Joi.string().length(6).required(),
  type: Joi.string().valid('EMAIL_VERIFICATION', 'PHONE_VERIFICATION').required(),
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
}).or('email', 'phoneNumber'); // At least one is required

export const createPinSchema = Joi.object({
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

// Profile validation schemas
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional(),
  lastName: Joi.string().min(1).max(100).optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
});

export const updateSettingsSchema = Joi.object({
  language: Joi.string().valid('en', 'ha', 'ig', 'yo').optional(),
  darkMode: Joi.boolean().optional(),
  biometricLogin: Joi.boolean().optional(),
  smsNotification: Joi.boolean().optional(),
  emailNotification: Joi.boolean().optional(),
  pushNotification: Joi.boolean().optional()
});

// Password change schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// PIN management schemas
export const updatePinSchema = Joi.object({
  currentPin: Joi.string().length(4).pattern(/^\d+$/).required(),
  newPin: Joi.string().length(4).pattern(/^\d+$/).required(),
  confirmPin: Joi.string().valid(Joi.ref('newPin')).required()
});

export const verifyPinSchema = Joi.object({
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

export const resetPinSchema = Joi.object({
  code: Joi.string().length(6).required(),
  newPin: Joi.string().length(4).pattern(/^\d+$/).required(),
  confirmPin: Joi.string().valid(Joi.ref('newPin')).required()
});

// Security questions schemas
export const setSecurityQuestionsSchema = Joi.object({
  question1: Joi.string().min(5).max(200).required(),
  answer1: Joi.string().min(2).max(100).required(),
  question2: Joi.string().min(5).max(200).required(),
  answer2: Joi.string().min(2).max(100).required(),
  question3: Joi.string().min(5).max(200).required(),
  answer3: Joi.string().min(2).max(100).required()
}).custom((value, helpers) => {
  // Ensure all questions are unique
  const questions = [value.question1, value.question2, value.question3];
  const uniqueQuestions = new Set(questions);
  if (uniqueQuestions.size !== 3) {
    return helpers.error('any.custom', { message: 'All security questions must be unique' });
  }
  return value;
});

export const verifySecurityQuestionsSchema = Joi.object({
  answer1: Joi.string().required(),
  answer2: Joi.string().required(),
  answer3: Joi.string().required()
});

// Biometric schemas
export const registerBiometricSchema = Joi.object({
  biometricToken: Joi.string().min(10).required()
});

export const verifyBiometricSchema = Joi.object({
  biometricToken: Joi.string().min(10).required()
});

// Password reset schemas
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
});

// Resend verification code schema
export const resendVerificationSchema = Joi.object({
  email: Joi.string().email().optional(),
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  type: Joi.string().valid('EMAIL_VERIFICATION', 'PHONE_VERIFICATION').required()
}).or('email', 'phoneNumber');

// Electricity payment schemas
const electricityServiceIds = [
  'ikeja-electric',
  'eko-electric',
  'kano-electric',
  'phed-ph',
  'jos-electric',
  'ibadan-electric',
  'kaduna-electric',
  'abuja-electric',
  'enugu-electric',
  'benin-electric',
  'aba-electric',
  'yola-electric'
] as const;

export const electricityValidateMeterSchema = Joi.object({
  serviceID: Joi.string().valid(...electricityServiceIds).required(),
  meterNumber: Joi.string().min(5).max(20).required(),
  type: Joi.string().valid('prepaid', 'postpaid').required()
});

export const electricityPurchaseSchema = Joi.object({
  serviceID: Joi.string().valid(...electricityServiceIds).required(),
  meterNumber: Joi.string().min(5).max(20).required(),
  amount: Joi.number().positive().required(),
  type: Joi.string().valid('prepaid', 'postpaid').required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  variation_code: Joi.string().valid('prepaid', 'postpaid').required(),
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

export const electricityHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// Airtime purchase schemas
const airtimeServiceIds = ['mtn', 'glo', 'airtel', '9mobile'] as const;

export const airtimePurchaseSchema = Joi.object({
  serviceID: Joi.string().valid(...airtimeServiceIds).required(),
  amount: Joi.number().positive().min(50).required(), // Minimum 50 NGN
  phone: Joi.string().pattern(/^(0|\+234)[0-9]{10,13}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be in format 08011111111 or +2348011111111'
    }),
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

export const airtimeHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

export const airtimeRequerySchema = Joi.object({
  purchaseId: Joi.string().required()
});

// Data purchase schemas
const dataServiceIds = ['mtn-data', 'glo-data', 'airtel-data', '9mobile-data'] as const;

export const dataGetVariationsSchema = Joi.object({
  serviceID: Joi.string().valid(...dataServiceIds).required()
});

export const dataPurchaseSchema = Joi.object({
  serviceID: Joi.string().valid(...dataServiceIds).required(),
  variation_code: Joi.string().min(1).required(),
  phone: Joi.string().pattern(/^(0|\+234)[0-9]{10,13}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be in format 08011111111 or +2348011111111'
    }),
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

export const dataHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

export const dataRequerySchema = Joi.object({
  purchaseId: Joi.string().required()
});

// TV subscription schemas
const tvServiceIds = ['dstv', 'gotv', 'startimes', 'showmax'] as const;

export const tvGetVariationsSchema = Joi.object({
  serviceID: Joi.string().valid(...tvServiceIds).required()
});

export const tvVerifySmartcardSchema = Joi.object({
  serviceID: Joi.string().valid(...tvServiceIds).required(),
  smartCardNumber: Joi.string().min(8).max(20).required()
});

export const tvPurchaseSchema = Joi.object({
  serviceID: Joi.string().valid(...tvServiceIds).required(),
  smartCardNumber: Joi.string().min(8).max(20).required(),
  subscription_type: Joi.string().valid('new', 'renew').required(),
  variation_code: Joi.string().min(1).required(),
  phone: Joi.string().pattern(/^(0|\+234)[0-9]{10,13}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be in format 08011111111 or +2348011111111'
    }),
  pin: Joi.string().length(4).pattern(/^\d+$/).required()
});

export const tvHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

export const tvRequerySchema = Joi.object({
  purchaseId: Joi.string().required()
});

// T-Ride validation schemas
export const nearbyParksQuerySchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required()
    .messages({
      'number.base': 'Latitude must be a valid number',
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),
  longitude: Joi.number().min(-180).max(180).required()
    .messages({
      'number.base': 'Longitude must be a valid number',
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    }),
  radius: Joi.number().positive().max(100).optional()
    .messages({
      'number.base': 'Radius must be a valid number',
      'number.positive': 'Radius must be a positive number',
      'number.max': 'Radius cannot exceed 100 kilometers'
    })
});

export const parkIdParamSchema = Joi.object({
  parkId: Joi.string().required()
    .messages({
      'string.empty': 'Park ID is required',
      'any.required': 'Park ID is required'
    })
});

export const vehicleIdParamSchema = Joi.object({
  vehicleId: Joi.string().required()
    .messages({
      'string.empty': 'Vehicle ID is required',
      'any.required': 'Vehicle ID is required'
    })
});

// Trip validation schemas
export const createTripSchema = Joi.object({
  routeId: Joi.string().required()
    .messages({
      'string.empty': 'Route ID is required',
      'any.required': 'Route ID is required'
    }),
  driverId: Joi.string().required()
    .messages({
      'string.empty': 'Driver ID is required',
      'any.required': 'Driver ID is required'
    }),
  vehicleId: Joi.string().required()
    .messages({
      'string.empty': 'Vehicle ID is required',
      'any.required': 'Vehicle ID is required'
    }),
  fare: Joi.number().positive().required()
    .messages({
      'number.base': 'Fare must be a valid number',
      'number.positive': 'Fare must be a positive number',
      'any.required': 'Fare is required'
    }),
  isLongDistance: Joi.boolean().optional(),
  originLatitude: Joi.number().min(-90).max(90).optional()
    .messages({
      'number.base': 'Origin latitude must be a valid number',
      'number.min': 'Origin latitude must be between -90 and 90',
      'number.max': 'Origin latitude must be between -90 and 90'
    }),
  originLongitude: Joi.number().min(-180).max(180).optional()
    .messages({
      'number.base': 'Origin longitude must be a valid number',
      'number.min': 'Origin longitude must be between -180 and 180',
      'number.max': 'Origin longitude must be between -180 and 180'
    }),
  destLatitude: Joi.number().min(-90).max(90).optional()
    .messages({
      'number.base': 'Destination latitude must be a valid number',
      'number.min': 'Destination latitude must be between -90 and 90',
      'number.max': 'Destination latitude must be between -90 and 90'
    }),
  destLongitude: Joi.number().min(-180).max(180).optional()
    .messages({
      'number.base': 'Destination longitude must be a valid number',
      'number.min': 'Destination longitude must be between -180 and 180',
      'number.max': 'Destination longitude must be between -180 and 180'
    })
});

export const tripIdParamSchema = Joi.object({
  tripId: Joi.string().required()
    .messages({
      'string.empty': 'Trip ID is required',
      'any.required': 'Trip ID is required'
    })
});

export const updateTripStatusSchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').required()
    .messages({
      'any.only': 'Status must be one of: PENDING, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED',
      'any.required': 'Status is required'
    })
});

export const tripQuerySchema = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED').optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
    .messages({
      'number.base': 'Limit must be a valid number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  offset: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Offset must be a valid number',
      'number.integer': 'Offset must be an integer',
      'number.min': 'Offset must be 0 or greater'
    })
});