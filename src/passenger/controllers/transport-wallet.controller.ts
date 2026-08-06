/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { TransportWalletService } from '../services/transport-wallet.service';


export class TransportWalletController {
  /**
   * GET /api/transport-wallet/balance
   */
  /**
   * @swagger
   * /api/transport-wallet/balance:
   *   get:
   *     summary: Get transport wallet balance
   *     tags: [Transport Wallet]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Balance retrieved successfully
   */
  static async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await TransportWalletService.getBalance(req.user!.id);
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
  /**
   * @swagger
   * /api/transport-wallet/transfer:
   *   post:
   *     summary: Fund transport wallet from main wallet
   *     tags: [Transport Wallet]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - amount
   *               - pin
   *             properties:
   *               amount:
   *                 type: number
   *                 description: Amount to transfer
   *               pin:
   *                 type: string
   *                 description: Transaction PIN
   *     responses:
   *       200:
   *         description: Transfer successful
   *       400:
   *         description: Invalid input or insufficient balance
   */
  static async fund(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, pin } = req.body;
      const result = await TransportWalletService.fundTransportWallet(req.user!.id, amount, pin);
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
  /**
   * @swagger
   * /api/transport-wallet/history:
   *   get:
   *     summary: Get transport wallet transaction history
   *     tags: [Transport Wallet]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *     responses:
   *       200:
   *         description: History retrieved successfully
   */
  static async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt((req.query.limit as string) || '20');
      const result = await TransportWalletService.getHistory(req.user!.id, limit);
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
