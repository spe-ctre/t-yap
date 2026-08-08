/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMReportService } from '../services/pm-report.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMReportController {
  static async getRevenueReport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;
      const report = await PMReportService.getRevenueReport(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      return res.json(report);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch revenue report');
    }
  }

  static async getTripReport(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;
      const report = await PMReportService.getTripReport(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      return res.json(report);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch trip report');
    }
  }
}