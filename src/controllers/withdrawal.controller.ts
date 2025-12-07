// src/controllers/withdrawal.controller.ts

import { Request, Response, NextFunction } from 'express';
import { WithdrawalService } from '../services/withdrawal.service';
import { AppError } from '../utils/errors';

export class WithdrawalController {
  /**
   * POST /api/withdrawals
   * Process withdrawal to bank account
   */
  static async processWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { amount, bankAccountId, pin, description } = req.body;

      // Validation
      if (!amount || !pin) {
        throw new AppError('Amount and PIN are required', 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('Amount must be a positive number', 400);
      }

      const result = await WithdrawalService.processWithdrawal({
        userId: userId!,
        amount,
        bankAccountId,
        pin,
        description,
      });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/withdrawals/limits
   * Get withdrawal limits configuration
   */
  static async getWithdrawalLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const limits = WithdrawalService.getWithdrawalLimits();

      res.status(200).json({
        status: 'success',
        data: {
          limits: {
            minimum: limits.minAmount,
            maximumPerTransaction: limits.maxAmountPerTransaction,
            maximumDaily: limits.maxDailyAmount,
            maximumDailyTransactions: limits.maxDailyTransactions,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/withdrawals/limits/remaining
   * Get user's remaining daily withdrawal limit
   */
  static async getRemainingLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const remaining = await WithdrawalService.getRemainingDailyLimit(userId!);

      res.status(200).json({
        status: 'success',
        data: remaining,
      });
    } catch (error) {
      next(error);
    }
  }
}