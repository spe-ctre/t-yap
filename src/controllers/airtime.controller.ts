import { Request, Response, NextFunction } from 'express';
import { AirtimeService } from '../services/airtime.service';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';
import { airtimePurchaseSchema, airtimeHistorySchema, airtimeRequerySchema } from '../utils/validation';

export class AirtimeController {
  private service: AirtimeService;

  constructor() {
    this.service = new AirtimeService();
  }

  purchase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = airtimePurchaseSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.service.purchaseAirtime(req.user.id, req.body, {
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
      const { error } = airtimeHistorySchema.validate(req.query);
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
      const { error } = airtimeRequerySchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { purchaseId } = req.body;
      const result = await this.service.requery(req.user.id, purchaseId);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };
}

