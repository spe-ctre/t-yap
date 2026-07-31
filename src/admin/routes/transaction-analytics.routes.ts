// src/routes/transaction-analytics.routes.ts

import { Router } from 'express';
import { TransactionAnalyticsController } from '../controllers/transaction-analytics.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/analytics/summary
 * @desc    Get transaction summary for authenticated user
 * @query   startDate, endDate (optional)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/summary',
  authMiddleware as any,
  TransactionAnalyticsController.getTransactionSummary as any
);

/**
 * @route   GET /api/analytics/categories
 * @desc    Get category breakdown
 * @query   startDate, endDate (optional)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/categories',
  authMiddleware as any,
  TransactionAnalyticsController.getCategoryBreakdown as any
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get transaction trends over time
 * @query   period (day|week|month, default: week)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/trends',
  authMiddleware as any,
  TransactionAnalyticsController.getTransactionTrends as any
);

/**
 * @route   GET /api/analytics/spending-patterns
 * @desc    Get spending patterns by day of week
 * @query   days (default: 30)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/spending-patterns',
  authMiddleware as any,
  TransactionAnalyticsController.getSpendingPatterns as any
);

/**
 * @route   GET /api/analytics/top-recipients
 * @desc    Get top recipients/merchants
 * @query   limit (default: 10)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/top-recipients',
  authMiddleware as any,
  TransactionAnalyticsController.getTopRecipients as any
);

/**
 * @route   GET /api/analytics/export
 * @desc    Export analytics data
 * @query   startDate, endDate (optional)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/export',
  authMiddleware as any,
  TransactionAnalyticsController.exportAnalytics as any
);

export default router;