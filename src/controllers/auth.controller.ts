import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { signupSchema, loginSchema, verifyCodeSchema, createPinSchema, changePasswordSchema, updatePinSchema, verifyPinSchema, resetPinSchema, forgotPasswordSchema, resetPasswordSchema, resendVerificationSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';

/**
 * AuthenticatedRequest interface
 * Extends Express Request to include user information from JWT token
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'PASSENGER' | 'DRIVER' | 'AGENT';
  };
}

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * User signup
   * POST /api/auth/signup
   */
  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = signupSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.signup(req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * User login
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = loginSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      // Pass device info from request
      const loginData = {
        ...req.body,
        ...req.deviceInfo
      };

      const result = await this.authService.login(loginData);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify email/phone code
   * POST /api/auth/verify
   * Requires authentication
   */
  verifyCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyCodeSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      // Pass device info for session creation after email verification
      const verifyData = {
        ...req.body,
        ...req.deviceInfo
      };

      const result = await this.authService.verifyCode(verifyData);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create transaction PIN
   * POST /api/auth/create-pin
   * Requires authentication
   */
  createPin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { error } = createPinSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      await this.authService.createTransactionPin(req.user.id, req.body.pin);
      res.json({ success: true, statusCode: 200, message: 'Transaction PIN created successfully' });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = changePasswordSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.changePassword(
        req.user.id,
        req.body.currentPassword,
        req.body.newPassword
      );
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  updatePin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updatePinSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.updateTransactionPin(
        req.user.id,
        req.body.currentPin,
        req.body.newPin
      );
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  verifyPin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyPinSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.verifyTransactionPin(req.user.id, req.body.pin);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  requestPinReset = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.authService.requestPinReset(req.user.id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  resetPin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = resetPinSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.resetTransactionPin(
        req.user.id,
        req.body.code,
        req.body.newPin
      );
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = forgotPasswordSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.forgotPassword(req.body.email);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = resetPasswordSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.resetPassword(req.body);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  resendVerificationCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = resendVerificationSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.authService.resendVerificationCode(req.body);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}