import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const paymentController = new PaymentController();

/**
 * @route   POST /api/payments/topup/initialize
 * @desc    Initialize a wallet top-up payment
 * @access  Private (Authenticated users)
 * @body    { amount: number }
 */
router.post('/topup/initialize', authMiddleware as any, (req, res, next) => paymentController.initializeTopup(req as any, res, next));

/**
 * @route   POST /api/payments/topup/verify
 * @desc    Verify and complete a wallet top-up
 * @access  Private (Authenticated users)
 * @body    { paymentReference: string }
 */
router.post('/topup/verify', authMiddleware as any, (req, res, next) => paymentController.verifyTopup(req as any, res, next));

/**
 * @route   POST /api/payments/webhook/monnify
 * @desc    Webhook endpoint for Monnify callbacks
 * @access  Public (No auth - verified by Monnify signature)
 */
router.post('/webhook/monnify', paymentController.monnifyWebhook);

export default router;