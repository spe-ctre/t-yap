// src/controllers/balance-reconciliation.controller.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { BalanceReconciliationService } from '../services/balance-reconciliation.service';
import { AppError } from '../utils/errors';
import { UserType } from '@prisma/client';

export class BalanceReconciliationController {
  /**
   * POST /api/balance/reconcile/user
   * Reconcile balance for the authenticated user
   */
  static async reconcileUserBalance(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || !userRole) {
        throw new AppError('User information not found', 401);
      }

      // Map auth role to UserType
      const userType = userRole.toUpperCase() as UserType;

      const result = await BalanceReconciliationService.reconcileUserBalance(
        userId,
        userType
      );

      res.status(200).json({
        status: 'success',
        message: result.isReconciled
          ? 'Balance reconciled successfully'
          : 'Balance discrepancy detected',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/balance/history
   * Get balance history for authenticated user
   */
  static async getUserBalanceHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, limit } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const options: any = {};
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }
      if (limit) {
        options.limit = parseInt(limit as string);
      }

      const history = await BalanceReconciliationService.getUserBalanceHistory(
        userId,
        options
      );

      res.status(200).json({
        status: 'success',
        data: {
          history,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/balance/trends
   * Get balance trends for authenticated user
   */
  static async getUserBalanceTrends(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { days } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const daysCount = days ? parseInt(days as string) : 30;

      const trends = await BalanceReconciliationService.getUserBalanceTrends(
        userId,
        daysCount
      );

      res.status(200).json({
        status: 'success',
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/balance/reconcile/all (ADMIN ONLY)
   * Reconcile all users' balances
   * This should be called by a cron job or admin
   */
  static async reconcileAllBalances(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await BalanceReconciliationService.reconcileAllBalances();

      res.status(200).json({
        status: 'success',
        message: 'Balance reconciliation completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/balance/discrepancies (ADMIN ONLY)
   * Get users with balance discrepancies
   */
  static async getUsersWithDiscrepancies(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const discrepancies =
        await BalanceReconciliationService.getUsersWithDiscrepancies();

      res.status(200).json({
        status: 'success',
        data: {
          discrepancies,
          count: discrepancies.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}