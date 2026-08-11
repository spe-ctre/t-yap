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
}