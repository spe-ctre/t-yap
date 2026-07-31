// src/routes/balance-reconciliation.routes.ts
import { Router } from 'express';
import { BalanceReconciliationController } from '../controllers/balance-reconciliation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';

const router = Router();

// ============================================
// USER BALANCE ROUTES (Authenticated Users)
// ============================================

/**
 * @route   POST /api/balance/reconcile/user
 * @desc    Reconcile authenticated user's balance
 * @access  Private (Authenticated Users)
 */
router.post(
  '/reconcile/user',
  authMiddleware as any,
  BalanceReconciliationController.reconcileUserBalance as any
);

/**
 * @route   GET /api/balance/history
 * @desc    Get balance history for authenticated user
 * @query   startDate, endDate, limit
 * @access  Private (Authenticated Users)
 */
router.get(
  '/history',
  authMiddleware as any,
  BalanceReconciliationController.getUserBalanceHistory as any
);

/**
 * @route   GET /api/balance/trends
 * @desc    Get balance trends for authenticated user
 * @query   days (default: 30)
 * @access  Private (Authenticated Users)
 */
router.get(
  '/trends',
  authMiddleware as any,
  BalanceReconciliationController.getUserBalanceTrends as any
);

// ============================================
// ADMIN ROUTES (Admin Only)
// ============================================

/**
 * @route   POST /api/balance/reconcile/all
 * @desc    Reconcile all users' balances
 * @access  Private (Admin Only)
 */
router.post(
  '/reconcile/all',
  authMiddleware as any,
  isAdmin as any,
  BalanceReconciliationController.reconcileAllBalances as any
);

/**
 * @route   GET /api/balance/discrepancies
 * @desc    Get users with balance discrepancies
 * @access  Private (Admin Only)
 */
router.get(
  '/discrepancies',
  authMiddleware as any,
  isAdmin as any,
  BalanceReconciliationController.getUsersWithDiscrepancies as any
);

export default router;