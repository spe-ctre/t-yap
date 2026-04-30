import { Response, NextFunction } from 'express';
import { TransportWalletService } from '../services/transport-wallet.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class TransportWalletController {
  /**
   * GET /api/transport-wallet/balance
   */
  static async getBalance(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TransportWalletService.getBalance(req.user.id);
      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/transport-wallet/transfer
   */
  static async fund(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { amount, pin } = req.body;
      const result = await TransportWalletService.fundTransportWallet(req.user.id, amount, pin);
      res.json({
        success: true,
        statusCode: 200,
        message: 'Transfer to transport wallet successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transport-wallet/history
   */
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const limit = parseInt((req.query.limit as string) || '20');
      const result = await TransportWalletService.getHistory(req.user.id, limit);
      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
