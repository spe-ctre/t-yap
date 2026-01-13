import { Request, Response, NextFunction } from 'express';
import { SecurityService } from '../services/security.service';
import { setSecurityQuestionsSchema, verifySecurityQuestionsSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';

export class SecurityController {
  private securityService: SecurityService;

  constructor() {
    this.securityService = new SecurityService();
  }

  setSecurityQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = setSecurityQuestionsSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.securityService.setSecurityQuestions(req.user!.id, req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateSecurityQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = setSecurityQuestionsSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      if (!req.body.currentPassword) {
        throw createError('Current password is required', 400);
      }

      const result = await this.securityService.updateSecurityQuestions(
        req.user!.id,
        req.body.currentPassword,
        {
          question1: req.body.question1,
          answer1: req.body.answer1,
          question2: req.body.question2,
          answer2: req.body.answer2,
          question3: req.body.question3,
          answer3: req.body.answer3
        }
      );
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  getSecurityQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.securityService.getSecurityQuestions(req.user!.id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  verifySecurityQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifySecurityQuestionsSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      await this.securityService.verifySecurityQuestions(req.user!.id, req.body);
      res.json({ success: true, statusCode: 200, message: 'Security questions verified successfully' });
    } catch (error) {
      next(error);
    }
  };
}

