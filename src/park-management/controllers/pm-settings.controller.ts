/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMSettingsService } from '../services/pm-settings.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMSettingsController {
  static async getParkDetails(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await PMSettingsService.getParkDetails(userId);
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch park details');
    }
  }

  static async updateParkSettings(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { commissionRate } = req.body;
      const result = await PMSettingsService.updateParkSettings(userId, commissionRate);
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to update settings');
    }
  }

  static async getParksList(req: Request, res: Response) {
    try {
      const parks = await PMSettingsService.getParksList();
      return res.json({ parks });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch parks list');
    }
  }

  static async setTransactionPin(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { pin } = req.body;

      if (!pin || pin.length !== 4) {
        return res.status(400).json({ error: '4-digit PIN is required' });
      }

      await PMSettingsService.setTransactionPin(userId, pin);
      return res.json({ message: 'PIN created successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to set transaction PIN');
    }
  }
}