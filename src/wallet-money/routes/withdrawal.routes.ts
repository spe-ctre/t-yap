// src/routes/withdrawal.routes.ts

import { Router } from 'express';
import { WithdrawalController } from '../controllers/withdrawal.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * All withdrawal routes require authentication
 */
router.use(authMiddleware as any);

/**
 * @route   POST /api/withdrawals
 * @desc    Process withdrawal to bank account
 * @access  Private
 * @body    { amount: number, bankAccountId?: string, pin: string, description?: string }
 */
router.post('/', WithdrawalController.processWithdrawal);

/**
 * @route   GET /api/withdrawals/limits
 * @desc    Get withdrawal limits configuration
 * @access  Private
 */
router.get('/limits', WithdrawalController.getWithdrawalLimits);

/**
 * @route   GET /api/withdrawals/limits/remaining
 * @desc    Get user's remaining daily withdrawal limit
 * @access  Private
 */
router.get('/limits/remaining', WithdrawalController.getRemainingLimit);

export default router;