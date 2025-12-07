// src/routes/transfer.routes.ts

import { Router } from 'express';
import { TransferController } from '../controllers/transfer.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * All transfer routes require authentication
 */
router.use(authMiddleware as any);

/**
 * @route   POST /api/transfers/p2p
 * @desc    Process peer-to-peer transfer
 * @access  Private
 * @body    { recipientId: string, amount: number, description?: string, pin: string }
 */
router.post('/p2p', TransferController.processTransfer);

/**
 * @route   POST /api/transfers/validate
 * @desc    Validate transfer before processing (pre-check)
 * @access  Private
 * @body    { recipientId: string, amount: number }
 */
router.post('/validate', TransferController.validateTransfer);

/**
 * @route   GET /api/transfers/limits
 * @desc    Get transfer limits configuration
 * @access  Private
 */
router.get('/limits', TransferController.getTransferLimits);

/**
 * @route   GET /api/transfers/limits/remaining
 * @desc    Get user's remaining daily transfer limit
 * @access  Private
 */
router.get('/limits/remaining', TransferController.getRemainingLimit);

/**
 * @route   GET /api/transfers/history
 * @desc    Get user's transfer history
 * @access  Private
 * @query   { limit?: number }
 */
router.get('/history', TransferController.getTransferHistory);

/**
 * @route   GET /api/transfers/:transferId
 * @desc    Get single transfer details
 * @access  Private
 */
router.get('/:transferId/receipt', TransferController.downloadReceipt);

router.get('/:transferId', TransferController.getTransferById);

export default router;