import { Router } from 'express';
import { TVSubscriptionController } from '../controllers/tv-subscription.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePinVerification } from '../middleware/pin.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';

const router = Router();
const controller = new TVSubscriptionController();

/**
 * @swagger
 * tags:
 *   name: TV Subscription
 *   description: TV subscription purchase and renewal services
 */

/**
 * @swagger
 * /api/tv-subscription/variations:
 *   get:
 *     summary: Get available TV subscription packages
 *     tags: [TV Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: serviceID
 *         required: true
 *         schema:
 *           type: string
 *           enum: [dstv, gotv, startimes, showmax]
 *         description: TV service provider ID
 *     responses:
 *       200:
 *         description: List of available subscription packages
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
 * /api/tv-subscription/verify:
 *   post:
 *     summary: Verify smartcard number
 *     tags: [TV Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TVVerifySmartcardRequest'
 *     responses:
 *       200:
 *         description: Smartcard verification result
 *       400:
 *         description: Validation error or invalid smartcard
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/verify',
  authMiddleware,
  requireEmailVerification,
  extractDeviceInfo,
  controller.verifySmartcard
);

/**
 * @swagger
 * /api/tv-subscription/purchase:
 *   post:
 *     summary: Purchase or renew TV subscription
 *     tags: [TV Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TVPurchaseRequest'
 *     responses:
 *       200:
 *         description: TV subscription processed successfully
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
 * /api/tv-subscription/history:
 *   get:
 *     summary: Get TV subscription purchase history
 *     tags: [TV Subscription]
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
 *         description: TV subscription purchase history
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
 * /api/tv-subscription/requery:
 *   post:
 *     summary: Requery TV subscription transaction status from VTpass
 *     tags: [TV Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TVRequeryRequest'
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


