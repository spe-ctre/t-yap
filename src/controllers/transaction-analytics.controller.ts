// src/controllers/transaction-analytics.controller.ts

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { TransactionAnalyticsService } from '../services/transaction-analytics.service';
import { AppError } from '../utils/errors';

export class TransactionAnalyticsController {
  /**
   * GET /api/analytics/summary
   * Get transaction summary for authenticated user
   */
  static async getTransactionSummary(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const summary = await TransactionAnalyticsService.getTransactionSummary(
        userId,
        start,
        end
      );

      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/categories
   * Get category breakdown
   */
  static async getCategoryBreakdown(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const categories = await TransactionAnalyticsService.getCategoryBreakdown(
        userId,
        start,
        end
      );

      res.status(200).json({
        status: 'success',
        data: {
          categories,
          count: categories.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/trends
   * Get transaction trends
   */
  static async getTransactionTrends(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { period } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const validPeriod = ['day', 'week', 'month'].includes(period as string)
        ? (period as 'day' | 'week' | 'month')
        : 'week';

      const trends = await TransactionAnalyticsService.getTransactionTrends(
        userId,
        validPeriod
      );

      res.status(200).json({
        status: 'success',
        data: {
          period: validPeriod,
          trends,
          count: trends.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/spending-patterns
   * Get spending patterns by day of week
   */
  static async getSpendingPatterns(
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

      const patterns = await TransactionAnalyticsService.getSpendingPatterns(
        userId,
        daysCount
      );

      res.status(200).json({
        status: 'success',
        data: {
          patterns,
          analyzedDays: daysCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/top-recipients
   * Get top recipients/merchants
   */
  static async getTopRecipients(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { limit } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const limitCount = limit ? parseInt(limit as string) : 10;

      const recipients = await TransactionAnalyticsService.getTopRecipients(
        userId,
        limitCount
      );

      res.status(200).json({
        status: 'success',
        data: {
          recipients,
          count: recipients.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/analytics/export
   * Export analytics data
   */
  static async exportAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const { startDate, endDate } = req.query;

      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const exportData = await TransactionAnalyticsService.exportAnalytics(
        userId,
        start,
        end
      );

      res.status(200).json({
        status: 'success',
        data: exportData,
      });
    } catch (error) {
      next(error);
    }
  }
}