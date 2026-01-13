import { Request, Response, NextFunction } from 'express';
import { BiometricService } from '../services/biometric.service';
import { registerBiometricSchema, verifyBiometricSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';

export class BiometricController {
  private biometricService: BiometricService;

  constructor() {
    this.biometricService = new BiometricService();
  }

  registerBiometric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = registerBiometricSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.biometricService.registerBiometric(req.user!.id, req.body.biometricToken);
      res.status(201).json({ success: true, statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  verifyBiometric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = verifyBiometricSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const isValid = await this.biometricService.verifyBiometric(req.user!.id, req.body.biometricToken);
      res.json({ success: true, statusCode: 200, data: { verified: isValid } });
    } catch (error) {
      next(error);
    }
  };

  removeBiometric = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.biometricService.removeBiometric(req.user!.id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  checkBiometricStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const isRegistered = await this.biometricService.isBiometricRegistered(req.user!.id);
      res.json({ success: true, statusCode: 200, data: { isRegistered } });
    } catch (error) {
      next(error);
    }
  };
}

