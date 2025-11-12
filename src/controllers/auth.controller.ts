import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { signupSchema, loginSchema, verifyCodeSchema, createPinSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

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

  verifyCode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyCodeSchema.validate(req.body);
      if (error) throw createError(error.details[0].message, 400);

      const result = await this.authService.verifyCode(req.user.id, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  createPin = async (req: Request, res: Response, next: NextFunction) => {
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