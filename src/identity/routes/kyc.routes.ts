import { Router } from 'express';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { KYCController } from '../controllers/kyc.controller';
import { uploadSingle } from '../../shared/middleware/upload.middleware';

const router = Router();

// All KYC routes require authentication
router.use(authMiddleware as any);

/**
 * @swagger
 * /api/kyc/status:
 *   get:
 *     summary: Get current KYC status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC status retrieved
 */
router.get('/status', KYCController.getStatus);

/**
 * @swagger
 * /api/kyc/bvn:
 *   post:
 *     summary: Submit BVN for verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bvn]
 *             properties:
 *               bvn:
 *                 type: string
 *                 example: "12345678901"
 *     responses:
 *       200:
 *         description: BVN submitted successfully
 */
router.post('/bvn', KYCController.verifyBVN);

/**
 * @swagger
 * /api/kyc/nin:
 *   post:
 *     summary: Submit NIN for verification
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nin]
 *             properties:
 *               nin:
 *                 type: string
 *                 example: "12345678901"
 *     responses:
 *       200:
 *         description: NIN submitted successfully
 */
router.post('/nin', KYCController.verifyNIN);

/**
 * @swagger
 * /api/kyc/address:
 *   post:
 *     summary: Submit home address
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address]
 *             properties:
 *               address:
 *                 type: string
 *                 example: "No. 123, Lagos Way, Ikeja"
 *     responses:
 *       200:
 *         description: Address submitted successfully
 */
router.post('/address', KYCController.submitAddress);

/**
 * @swagger
 * /api/kyc/face:
 *   post:
 *     summary: Upload and submit face verification image
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [picture]
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *                 description: Face image file (JPEG, PNG, or WebP)
 *     responses:
 *       200:
 *         description: Face image uploaded and submitted for review
 *       400:
 *         description: Missing or invalid image file
 *       503:
 *         description: Upload service unavailable
 */
router.post('/face', authMiddleware, uploadSingle, KYCController.uploadFace);

export default router;
