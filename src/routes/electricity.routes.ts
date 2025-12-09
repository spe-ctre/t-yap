import { Router } from 'express';
import { ElectricityController } from '../controllers/electricity.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePinVerification } from '../middleware/pin.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';

const router = Router();
const controller = new ElectricityController();

/**
 * @swagger
 * tags:
 *   name: Electricity
 *   description: Electricity payment and meter services
 */

/**
 * @swagger
 * /api/electricity/validate-meter:
 *   post:
 *     summary: Validate an electricity meter number
 *     tags: [Electricity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElectricityValidateMeterRequest'
 *     responses:
 *       200:
 *         description: Meter validated successfully
 *       400:
 *         description: Validation error or invalid meter
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/validate-meter',
  authMiddleware as any,
  requireEmailVerification,
  extractDeviceInfo,
  controller.validateMeter as any
);

/**
 * @swagger
 * /api/electricity/purchase:
 *   post:
 *     summary: Purchase electricity token
 *     tags: [Electricity]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ElectricityPurchaseRequest'
 *     responses:
 *       200:
 *         description: Electricity purchase processed
 *       400:
 *         description: Validation error or insufficient balance
 *       401:
 *         description: Unauthorized or invalid PIN
 */
router.post(
  '/purchase',
  authMiddleware as any,
  requireEmailVerification,
  requirePinVerification,
  extractDeviceInfo,
  controller.purchase as any
);

/**
 * @swagger
 * /api/electricity/history:
 *   get:
 *     summary: Get electricity payment history
 *     tags: [Electricity]
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
 *         description: Electricity payment history
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/history',
  authMiddleware as any,
  requireEmailVerification,
  controller.history as any
);

/**
 * @swagger
 * /api/electricity/requery/{id}:
 *   post:
 *     summary: Requery electricity transaction status from VTpass
 *     tags: [Electricity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Electricity VAS purchase ID
 *     responses:
 *       200:
 *         description: Requery result
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Purchase not found
 */
router.post(
  '/requery/:id',
  authMiddleware as any,
  requireEmailVerification,
  controller.requery as any
);

export default router;



