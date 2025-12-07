import { Request, Response, NextFunction } from 'express';
import { ElectricityService } from '../services/electricity.service';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';
import { electricityValidateMeterSchema, electricityPurchaseSchema, electricityHistorySchema } from '../utils/validation';

export class ElectricityController {
  private service: ElectricityService;

  constructor() {
    this.service = new ElectricityService();
  }

  validateMeter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = electricityValidateMeterSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.service.validateMeter(req.user.id, req.body, {
        ipAddress: req.deviceInfo?.ipAddress,
        userAgent: req.deviceInfo?.userAgent
      });

      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };

  purchase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = electricityPurchaseSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.service.purchaseElectricity(req.user.id, req.body, {
        ipAddress: req.deviceInfo?.ipAddress,
        userAgent: req.deviceInfo?.userAgent
      });

      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };

  history = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = electricityHistorySchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);

      const result = await this.service.getHistory(req.user.id, { page, limit });
      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };

  requery = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!id) {
        throw createError('Electricity purchase ID is required', 400);
      }

      const result = await this.service.requery(req.user.id, id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };
}



