import { Router } from 'express';
import { DataController } from '../controllers/data.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePinVerification } from '../middleware/pin.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';

const router = Router();
const controller = new DataController();

/**
 * @swagger
 * tags:
 *   name: Data
 *   description: Data subscription purchase services
 */

/**
 * @swagger
 * /api/data/variations:
 *   get:
 *     summary: Get available data subscription plans
 *     tags: [Data]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceID
 *         required: true
 *         schema:
 *           type: string
 *           enum: [mtn-data, glo-data, airtel-data, 9mobile-data]
 *         description: Network provider service ID
 *     responses:
 *       200:
 *         description: List of available data plans
 *       400:
 *         description: Invalid serviceID
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/variations',
  authMiddleware,
  requireEmailVerification,
  controller.getVariations
);

/**
 * @swagger
 * /api/data/purchase:
 *   post:
 *     summary: Purchase data bundle
 *     tags: [Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataPurchaseRequest'
 *     responses:
 *       200:
 *         description: Data purchase processed successfully
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
 * /api/data/history:
 *   get:
 *     summary: Get data purchase history
 *     tags: [Data]
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
 *         description: Data purchase history
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
 * /api/data/requery:
 *   post:
 *     summary: Requery data transaction status from VTpass
 *     tags: [Data]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DataRequeryRequest'
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

