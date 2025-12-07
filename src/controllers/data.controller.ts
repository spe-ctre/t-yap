import { Request, Response, NextFunction } from 'express';
import { DataService } from '../services/data.service';
import { createError } from '../middleware/error.middleware';
import { getValidationErrorMessage } from '../utils/validation-error.util';
import { dataGetVariationsSchema, dataPurchaseSchema, dataHistorySchema, dataRequerySchema } from '../utils/validation';

export class DataController {
  private service: DataService;

  constructor() {
    this.service = new DataService();
  }

  getVariations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = dataGetVariationsSchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { serviceID } = req.query;
      const result = await this.service.getVariations(serviceID as string);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (err) {
      next(err);
    }
  };

  purchase = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = dataPurchaseSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const result = await this.service.purchaseData(req.user.id, req.body, {
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
      const { error } = dataHistorySchema.validate(req.query);
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
      const { error } = dataRequerySchema.validate(req.body);
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

