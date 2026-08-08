/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMTransactionService } from '../services/pm-transaction.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMTransactionController {
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { driverId, routeId, status, startDate, endDate, page = '1', limit = '20', search } = req.query;

      const result = await PMTransactionService.getAllTransactions(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        {
          driverId: driverId as string | undefined,
          routeId: routeId as string | undefined,
          status: status as string | undefined,
          startDate: startDate as string | undefined,
          endDate: endDate as string | undefined,
          search: search as string | undefined,
        }
      );

      return res.json({ success: true, ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch transactions');
    }
  }
}