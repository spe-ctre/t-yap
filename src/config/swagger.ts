import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'T-Yap API',
      version: '1.0.0',
      description: 'Digital Transport Payment Solution API'
    },
    servers: [{ url: 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        SignupRequest: {
          type: 'object',
          required: ['email', 'phoneNumber', 'password', 'confirmPassword'],
          properties: {
            email: { type: 'string', format: 'email' },
            phoneNumber: { type: 'string' },
            password: { type: 'string', minLength: 8 },
            confirmPassword: { type: 'string' }
          }
        },
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
            code: { type: 'string', minLength: 6, maxLength: 6 },
            type: { type: 'string', enum: ['EMAIL_VERIFICATION', 'PHONE_VERIFICATION'] }
          }
        },
        CreatePinRequest: {
          type: 'object',
          required: ['pin'],
          properties: {
            pin: { type: 'string', minLength: 4, maxLength: 4 }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts']
};

export const specs = swaggerJsdoc(options);