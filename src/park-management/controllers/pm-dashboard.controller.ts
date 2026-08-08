/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMDashboardService } from '../services/pm-dashboard.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMDashboardController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const result = await PMDashboardService.getDashboard(userId);
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch dashboard');
    }
  }

  static async startShift(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { biometricData } = req.body;

      if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

      const result = await PMDashboardService.startShift(userId, biometricData);
      return res.json({ message: 'Shift started successfully', ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to start shift');
    }
  }

  static async endShift(req: Request, res: Response) {
    try {
      const result = await PMDashboardService.endShift();
      return res.json({ message: 'Shift ended successfully', ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to end shift');
    }
  }
}