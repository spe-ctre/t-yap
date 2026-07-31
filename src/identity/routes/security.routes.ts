import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const securityController = new SecurityController();

/**
 * @swagger
 * /api/security/questions:
 *   post:
 *     summary: Set security questions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetSecurityQuestionsRequest'
 *     responses:
 *       201:
 *         description: Security questions set successfully
 *       409:
 *         description: Security questions already set
 */
router.post('/questions', authMiddleware, securityController.setSecurityQuestions);

/**
 * @swagger
 * /api/security/questions:
 *   put:
 *     summary: Update security questions
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSecurityQuestionsRequest'
 *     responses:
 *       200:
 *         description: Security questions updated successfully
 *       401:
 *         description: Current password is incorrect
 */
router.put('/questions', authMiddleware, securityController.updateSecurityQuestions);

/**
 * @swagger
 * /api/security/questions:
 *   get:
 *     summary: Get security questions (without answers)
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Security questions retrieved successfully
 *       404:
 *         description: Security questions not set
 */
router.get('/questions', authMiddleware, securityController.getSecurityQuestions);

/**
 * @swagger
 * /api/security/questions/verify:
 *   post:
 *     summary: Verify security question answers
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifySecurityQuestionsRequest'
 *     responses:
 *       200:
 *         description: Security questions verified successfully
 *       401:
 *         description: One or more answers are incorrect
 */
router.post('/questions/verify', authMiddleware, securityController.verifySecurityQuestions);

/**
 * @swagger
 * /api/security/questions/public:
 *   get:
 *     summary: Get user's security questions by email/phone (unauthenticated for forgot password)
 *     tags: [Security]
 *     parameters:
 *       - in: query
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Questions retrieved
 *       404:
 *         description: User or security questions not found
 */
router.get('/questions/public', securityController.getPublicQuestions);

/**
 * @swagger
 * /api/security/questions/reset-password:
 *   post:
 *     summary: Reset password using security questions (unauthenticated)
 *     tags: [Security]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, answer1, answer2, answer3, newPassword]
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       401:
 *         description: Security answers incorrect
 */
router.post('/questions/reset-password', securityController.resetPasswordWithQuestions);

export default router;

