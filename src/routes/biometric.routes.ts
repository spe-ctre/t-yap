import { Router } from 'express';
import { BiometricController } from '../controllers/biometric.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePassenger } from '../middleware/role.middleware';

const router = Router();
const biometricController = new BiometricController();

/**
 * @swagger
 * /api/biometric/register:
 *   post:
 *     summary: Register biometric data
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBiometricRequest'
 *     responses:
 *       201:
 *         description: Biometric data registered successfully
 *       400:
 *         description: Invalid request or role not supported
 */
router.post('/register', authMiddleware, requirePassenger, biometricController.registerBiometric);

/**
 * @swagger
 * /api/biometric/verify:
 *   post:
 *     summary: Verify biometric token
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyBiometricRequest'
 *     responses:
 *       200:
 *         description: Biometric verification result
 *       404:
 *         description: Biometric data not registered
 */
router.post('/verify', authMiddleware, requirePassenger, biometricController.verifyBiometric);

/**
 * @swagger
 * /api/biometric/remove:
 *   delete:
 *     summary: Remove biometric data
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Biometric data removed successfully
 *       404:
 *         description: Biometric data not registered
 */
router.delete('/remove', authMiddleware, requirePassenger, biometricController.removeBiometric);

/**
 * @swagger
 * /api/biometric/status:
 *   get:
 *     summary: Check biometric registration status
 *     tags: [Biometric]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Biometric status retrieved successfully
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
 *                     isRegistered:
 *                       type: boolean
 */
router.get('/status', authMiddleware, requirePassenger, biometricController.checkBiometricStatus);

export default router;

