import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { TransportWalletController } from '../controllers/transport-wallet.controller';

const router = Router();

// All transport wallet routes require authentication
router.use(authMiddleware as any);

/**
 * @swagger
 * /api/transport-wallet/balance:
 *   get:
 *     summary: Get transport wallet balance
 *     tags: [Transport Wallet]
 */
router.get('/balance', TransportWalletController.getBalance);

/**
 * @swagger
 * /api/transport-wallet/transfer:
 *   post:
 *     summary: Fund transport wallet from main wallet
 *     tags: [Transport Wallet]
 */
router.post('/transfer', TransportWalletController.fund);

/**
 * @swagger
 * /api/transport-wallet/history:
 *   get:
 *     summary: Get transport wallet transaction history
 *     tags: [Transport Wallet]
 */
router.get('/history', TransportWalletController.getHistory);

export default router;
