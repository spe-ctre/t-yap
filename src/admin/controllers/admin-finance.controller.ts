import { Request, Response, NextFunction } from 'express';
import { AdminFinanceService } from '../services/admin-finance.service';
import { AppError } from '../../shared/utils/errors';

export class AdminFinanceController {
  
  // GET /api/finance/settlements/pending
  static async getPendingSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const settlements = await AdminFinanceService.getPendingSettlements();
      
      res.status(200).json({
        status: 'success',
        data: settlements
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/finance/settlements/bulk-approve
  static async bulkApproveSettlements(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('An array of transaction IDs is required', 400);
      }

      const adminId = req.user!.id;
      const result = await AdminFinanceService.bulkApproveSettlements(ids, adminId);

      res.status(200).json({
        status: 'success',
        message: `Successfully approved ${result.successCount} payouts. Failed: ${result.failCount}`,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
