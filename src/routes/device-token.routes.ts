import { Router } from 'express';
import { DeviceTokenController } from '../controllers/device-token.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const deviceTokenController = new DeviceTokenController();

/**
 * @swagger
 * /api/device-tokens/register:
 *   post:
 *     summary: Register device token for push notifications
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - platform
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               platform:
 *                 type: string
 *                 enum: [ios, android]
 *                 description: Device platform
 *     responses:
 *       200:
 *         description: Token registered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/register', authMiddleware, deviceTokenController.registerToken);

/**
 * @swagger
 * /api/device-tokens:
 *   get:
 *     summary: Get user's registered device tokens
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of device tokens
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, deviceTokenController.getTokens);

/**
 * @swagger
 * /api/device-tokens:
 *   delete:
 *     summary: Remove device token (logout)
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token to remove
 *     responses:
 *       200:
 *         description: Token removed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.delete('/', authMiddleware, deviceTokenController.removeToken);

export default router;