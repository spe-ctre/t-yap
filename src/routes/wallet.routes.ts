// src/routes/wallet.routes.ts

import { Router, RequestHandler } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const walletController = new WalletController();

/**
 * @swagger
 * /api/wallet/balance:
 *   get:
 *     summary: Get wallet balance
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                     currency:
 *                       type: string
 *       401:
 *         description: Unauthorized - Invalid or missing token
 */
router.get('/balance', authMiddleware as unknown as RequestHandler, walletController.getBalance as unknown as RequestHandler);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of transactions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of transactions to skip
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', authMiddleware as unknown as RequestHandler, walletController.getTransactionHistory as unknown as RequestHandler);

/**
 * @swagger
 * /api/wallet/topup/initialize:
 *   post:
 *     summary: Initialize wallet top-up
 *     tags: [Wallet]
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
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 100
 *                 maximum: 1000000
 *                 description: Amount to top-up (₦100 - ₦1,000,000)
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Top-up initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                     paymentReference:
 *                       type: string
 *                     checkoutUrl:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     currency:
 *                       type: string
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Unauthorized
 */
router.post('/topup/initialize', authMiddleware as unknown as RequestHandler, walletController.initializeTopUp as unknown as RequestHandler);

/**
 * @swagger
 * /api/wallet/topup/verify:
 *   post:
 *     summary: Verify and complete top-up transaction
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionReference
 *             properties:
 *               transactionReference:
 *                 type: string
 *                 description: Payment reference from initialize endpoint
 *                 example: TOPUP_1234567890_abc12345
 *     responses:
 *       200:
 *         description: Top-up verified and completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     transaction:
 *                       type: object
 *                     balance:
 *                       type: object
 *       400:
 *         description: Payment not completed or invalid
 *       404:
 *         description: Transaction not found
 */
router.post('/topup/verify', authMiddleware as unknown as RequestHandler, walletController.verifyTopUp as unknown as RequestHandler);

/**
 * @swagger
 * /api/wallet/topup/status/{reference}:
 *   get:
 *     summary: Get top-up transaction status
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction reference
 *     responses:
 *       200:
 *         description: Transaction status retrieved
 *       404:
 *         description: Transaction not found
 */
router.get('/topup/status/:reference', authMiddleware as unknown as RequestHandler, walletController.getTopUpStatus as unknown as RequestHandler);

export default router;