import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const settingsController = new SettingsController();

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User settings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, settingsController.getSettings);

/**
 * @swagger
 * /api/settings/notifications:
 *   patch:
 *     summary: Update notification preferences
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pushNotification:
 *                 type: boolean
 *                 description: Enable/disable push notifications
 *               emailNotification:
 *                 type: boolean
 *                 description: Enable/disable email notifications
 *               smsNotification:
 *                 type: boolean
 *                 description: Enable/disable SMS notifications
 *     responses:
 *       200:
 *         description: Notification preferences updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch('/notifications', authMiddleware, settingsController.updateNotificationSettings);

/**
 * @swagger
 * /api/settings/general:
 *   patch:
 *     summary: Update general settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 enum: [en, ha, ig, yo]
 *                 description: App language
 *               darkMode:
 *                 type: boolean
 *                 description: Enable/disable dark mode
 *               biometricLogin:
 *                 type: boolean
 *                 description: Enable/disable biometric login
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.patch('/general', authMiddleware, settingsController.updateGeneralSettings);

export default router;