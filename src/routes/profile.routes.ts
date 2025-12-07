import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const profileController = new ProfileController();

/**
 * @swagger
 * /api/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ProfileResponse'
 */
router.get('/', authMiddleware, profileController.getProfile);

/**
 * @swagger
 * /api/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/', authMiddleware, profileController.updateProfile);

/**
 * @swagger
 * /api/profile/picture:
 *   post:
 *     summary: Upload profile picture
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Picture uploaded successfully
 *       400:
 *         description: Invalid file format or size
 */
router.post('/picture', authMiddleware, uploadSingle, profileController.uploadProfilePicture);

/**
 * @swagger
 * /api/profile/picture:
 *   delete:
 *     summary: Delete profile picture
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Picture deleted successfully
 */
router.delete('/picture', authMiddleware, profileController.deleteProfilePicture);

/**
 * @swagger
 * /api/profile/settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserSettings'
 */
router.get('/settings', authMiddleware, profileController.getSettings);

/**
 * @swagger
 * /api/profile/settings:
 *   put:
 *     summary: Update user settings
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 */
router.put('/settings', authMiddleware, profileController.updateSettings);

export default router;

