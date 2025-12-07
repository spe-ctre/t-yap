import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { signupSchema, loginSchema, verifyCodeSchema, createPinSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';

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
      if (error) throw createError(error.details[0].message, 400);

      const result = await this.authService.signup(req.body);
      res.status(201).json({ success: true, data: result });
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
      if (error) throw createError(error.details[0].message, 400);

      const result = await this.authService.login(req.body);
      res.json({ success: true, data: result });
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
      if (error) throw createError(error.details[0].message, 400);

      const result = await this.authService.verifyCode(req.user.id, req.body);
      res.json({ success: true, data: result });
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
      if (error) throw createError(error.details[0].message, 400);

      await this.authService.createTransactionPin(req.user.id, req.body.pin);
      res.json({ success: true, message: 'Transaction PIN created successfully' });
    } catch (error) {
      next(error);
    }
  };
}