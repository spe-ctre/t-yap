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

export default router;

