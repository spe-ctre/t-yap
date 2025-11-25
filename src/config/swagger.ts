import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'T-Yap API',
      version: '1.0.0',
      description: 'Digital Transport Payment Solution API'
    },
    servers: [
      { url: 'https://t-yap-d0rj.onrender.com', description: 'Production server' },
      { url: 'http://localhost:3000', description: 'Development server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
            rememberMe: { type: 'boolean' }
          }
        },
        VerifyCodeRequest: {
          type: 'object',
          required: ['code', 'type'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6, description: '6-digit verification code' },
            type: { type: 'string', enum: ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION'], description: 'Type of verification' },
            email: { type: 'string', format: 'email', description: 'User email (required if phoneNumber not provided)' },
            phoneNumber: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$', description: 'User phone number (required if email not provided)' }
          },
          description: 'Either email or phoneNumber must be provided to identify the user'
        },
        SignupRequest: {
          type: 'object',
          required: ['email', 'phoneNumber', 'password', 'confirmPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            phoneNumber: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' },
            password: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string' },
            role: { type: 'string', enum: ['PASSENGER', 'DRIVER', 'AGENT', 'PARK_MANAGER'], default: 'PASSENGER', description: 'User role (optional, defaults to PASSENGER)' }
          }
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['email', 'code', 'newPassword', 'confirmPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            code: { type: 'string', minLength: 6, maxLength: 6 },
            newPassword: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string', minLength: 8 }
          }
        },
        ResendVerificationRequest: {
          type: 'object',
          required: ['type'],
          properties: {
            email: { type: 'string', format: 'email', description: 'User email (required if phoneNumber not provided)' },
            phoneNumber: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$', description: 'User phone number (required if email not provided)' },
            type: { type: 'string', enum: ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION'] }
          },
          description: 'Either email or phoneNumber must be provided'
        },
        CreatePinRequest: {
          type: 'object',
          required: ['pin'],
          properties: {
            pin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword', 'confirmPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string', minLength: 8 }
          }
        },
        UpdatePinRequest: {
          type: 'object',
          required: ['currentPin', 'newPin', 'confirmPin'],
          properties: {
            currentPin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' },
            newPin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' },
            confirmPin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' }
          }
        },
        VerifyPinRequest: {
          type: 'object',
          required: ['pin'],
          properties: {
            pin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' }
          }
        },
        ResetPinRequest: {
          type: 'object',
          required: ['code', 'newPin', 'confirmPin'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 6 },
            newPin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' },
            confirmPin: { type: 'string', minLength: 4, maxLength: 4, pattern: '^\\d+$' }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            phoneNumber: { type: 'string', pattern: '^\\+?[1-9]\\d{1,14}$' }
          }
        },
        ProfileResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            phoneNumber: { type: 'string' },
            role: { type: 'string', enum: ['PASSENGER', 'DRIVER', 'AGENT', 'PARK_MANAGER'] },
            isEmailVerified: { type: 'boolean' },
            isPhoneVerified: { type: 'boolean' },
            profile: { type: 'object' },
            settings: { $ref: '#/components/schemas/UserSettings' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UpdateSettingsRequest: {
          type: 'object',
          properties: {
            language: { type: 'string', enum: ['en', 'ha', 'ig', 'yo'] },
            darkMode: { type: 'boolean' },
            biometricLogin: { type: 'boolean' },
            smsNotification: { type: 'boolean' },
            emailNotification: { type: 'boolean' },
            pushNotification: { type: 'boolean' }
          }
        },
        UserSettings: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            language: { type: 'string', default: 'en' },
            darkMode: { type: 'boolean', default: false },
            biometricLogin: { type: 'boolean', default: false },
            smsNotification: { type: 'boolean', default: true },
            emailNotification: { type: 'boolean', default: true },
            pushNotification: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        SetSecurityQuestionsRequest: {
          type: 'object',
          required: ['question1', 'answer1', 'question2', 'answer2', 'question3', 'answer3'],
          properties: {
            question1: { type: 'string', minLength: 5, maxLength: 200 },
            answer1: { type: 'string', minLength: 2, maxLength: 100 },
            question2: { type: 'string', minLength: 5, maxLength: 200 },
            answer2: { type: 'string', minLength: 2, maxLength: 100 },
            question3: { type: 'string', minLength: 5, maxLength: 200 },
            answer3: { type: 'string', minLength: 2, maxLength: 100 }
          }
        },
        UpdateSecurityQuestionsRequest: {
          type: 'object',
          required: ['currentPassword', 'question1', 'answer1', 'question2', 'answer2', 'question3', 'answer3'],
          properties: {
            currentPassword: { type: 'string' },
            question1: { type: 'string', minLength: 5, maxLength: 200 },
            answer1: { type: 'string', minLength: 2, maxLength: 100 },
            question2: { type: 'string', minLength: 5, maxLength: 200 },
            answer2: { type: 'string', minLength: 2, maxLength: 100 },
            question3: { type: 'string', minLength: 5, maxLength: 200 },
            answer3: { type: 'string', minLength: 2, maxLength: 100 }
          }
        },
        VerifySecurityQuestionsRequest: {
          type: 'object',
          required: ['answer1', 'answer2', 'answer3'],
          properties: {
            answer1: { type: 'string' },
            answer2: { type: 'string' },
            answer3: { type: 'string' }
          }
        },
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            deviceName: { type: 'string' },
            deviceType: { type: 'string' },
            ipAddress: { type: 'string' },
            lastActivity: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        RegisterBiometricRequest: {
          type: 'object',
          required: ['biometricToken'],
          properties: {
            biometricToken: { type: 'string', minLength: 10 }
          }
        },
        VerifyBiometricRequest: {
          type: 'object',
          required: ['biometricToken'],
          properties: {
            biometricToken: { type: 'string', minLength: 10 }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const specs = swaggerJsdoc(options);