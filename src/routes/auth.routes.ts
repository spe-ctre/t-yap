import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePassenger } from '../middleware/role.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new passenger
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: User already exists
 */
router.post('/signup', extractDeviceInfo, authController.signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', extractDeviceInfo, authController.login);

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify email/phone code
 *     tags: [Authentication]
 *     description: Verify email or phone verification code. Does not require authentication - user is identified by email/phone number.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyCodeRequest'
 *     responses:
 *       200:
 *         description: Verification successful
 *       400:
 *         description: Invalid or expired code
 *       404:
 *         description: User not found
 */
router.post('/verify', extractDeviceInfo, authController.verifyCode);

/**
 * @swagger
 * /api/auth/create-pin:
 *   post:
 *     summary: Create transaction PIN
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePinRequest'
 *     responses:
 *       200:
 *         description: PIN created successfully
 *       400:
 *         description: Invalid PIN format
 */
router.post('/create-pin', authMiddleware, requireEmailVerification, requirePassenger, authController.createPin);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
router.put('/change-password', authMiddleware, requireEmailVerification, authController.changePassword);

/**
 * @swagger
 * /api/auth/update-pin:
 *   put:
 *     summary: Update transaction PIN
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePinRequest'
 *     responses:
 *       200:
 *         description: PIN updated successfully
 *       401:
 *         description: Current PIN is incorrect
 */
router.put('/update-pin', authMiddleware, requireEmailVerification, requirePassenger, authController.updatePin);

/**
 * @swagger
 * /api/auth/verify-pin:
 *   post:
 *     summary: Verify transaction PIN
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyPinRequest'
 *     responses:
 *       200:
 *         description: PIN verified successfully
 *       401:
 *         description: Invalid PIN
 */
router.post('/verify-pin', authMiddleware, authController.verifyPin);

/**
 * @swagger
 * /api/auth/request-pin-reset:
 *   post:
 *     summary: Request PIN reset code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reset code sent to email
 */
router.post('/request-pin-reset', authMiddleware, authController.requestPinReset);

/**
 * @swagger
 * /api/auth/reset-pin:
 *   post:
 *     summary: Reset transaction PIN using code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPinRequest'
 *     responses:
 *       200:
 *         description: PIN reset successfully
 *       400:
 *         description: Invalid or expired code
 */
router.post('/reset-pin', authMiddleware, authController.resetPin);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset code sent to email (if account exists)
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired code
 */
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *       400:
 *         description: Already verified or invalid request
 */
router.post('/resend-verification', authController.resendVerificationCode);

export default router;