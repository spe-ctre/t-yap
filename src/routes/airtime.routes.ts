import { Router } from 'express';
import { AirtimeController } from '../controllers/airtime.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePinVerification } from '../middleware/pin.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';

const router = Router();
const controller = new AirtimeController();

/**
 * @swagger
 * tags:
 *   name: Airtime
 *   description: Airtime purchase services
 */

/**
 * @swagger
 * /api/airtime/purchase:
 *   post:
 *     summary: Purchase airtime
 *     tags: [Airtime]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AirtimePurchaseRequest'
 *     responses:
 *       200:
 *         description: Airtime purchase processed successfully
 *       400:
 *         description: Validation error or insufficient balance
 *       401:
 *         description: Unauthorized or invalid PIN
 */
router.post(
  '/purchase',
  authMiddleware,
  requireEmailVerification,
  requirePinVerification,
  extractDeviceInfo,
  controller.purchase
);

/**
 * @swagger
 * /api/airtime/history:
 *   get:
 *     summary: Get airtime purchase history
 *     tags: [Airtime]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Airtime purchase history
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  authMiddleware,
  requireEmailVerification,
  controller.history
);

/**
 * @swagger
 * /api/airtime/requery:
 *   post:
 *     summary: Requery airtime transaction status from VTpass
 *     tags: [Airtime]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AirtimeRequeryRequest'
 *     responses:
 *       200:
 *         description: Requery result
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Purchase not found
 */
router.post(
  '/requery',
  authMiddleware,
  requireEmailVerification,
  controller.requery
);

export default router;

