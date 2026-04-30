import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { extractDeviceInfo } from '../middleware/device.middleware';
import { requireEmailVerification } from '../middleware/verification.middleware';
import { requirePassenger } from '../middleware/role.middleware';
import { requirePinExists } from '../middleware/pin.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User signup, login, verification, passwords and PINs
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
router.post('/signup', extractDeviceInfo, (req, res, next) => authController.signup(req, res, next));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email/phone and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Logged in successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials or verification required
 */
router.post('/login', extractDeviceInfo, (req, res, next) => authController.login(req, res, next));

/**
 * @swagger
 * /api/auth/verify:
 *   post:
 *     summary: Verify email or phone with code
 *     tags: [Authentication]
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
 *         description: Validation error
 */
router.post('/verify', extractDeviceInfo, (req, res, next) => authController.verifyCode(req as any, res, next));

/**
 * @swagger
 * /api/auth/create-pin:
 *   post:
 *     summary: Create transaction PIN (passengers)
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
 *         description: PIN created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not allowed for this role
 */
router.post(
  '/create-pin',
  authMiddleware as any,
  requireEmailVerification,
  requirePassenger,
  (req, res, next) => authController.createPin(req as any, res, next)
);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change password (authenticated)
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
 *         description: Password changed
 *       400:
 *         description: Validation error
 */
router.put('/change-password', authMiddleware as any, (req, res, next) => authController.changePassword(req as any, res, next));

/**
 * @swagger
 * /api/auth/update-pin:
 *   put:
 *     summary: Update transaction PIN (passengers)
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
 *         description: PIN updated
 */
router.put(
  '/update-pin',
  authMiddleware as any,
  requireEmailVerification,
  requirePassenger,
  requirePinExists,
  (req, res, next) => authController.updatePin(req as any, res, next)
);

/**
 * @swagger
 * /api/auth/verify-pin:
 *   post:
 *     summary: Verify transaction PIN (passengers)
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
 *         description: PIN verified
 */
router.post(
  '/verify-pin',
  authMiddleware as any,
  requirePassenger,
  requirePinExists,
  (req, res, next) => authController.verifyPin(req as any, res, next)
);

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
 *         description: PIN reset code sent
 */
router.post(
  '/request-pin-reset',
  authMiddleware as any,
  requirePassenger,
  requirePinExists,
  (req, res, next) => authController.requestPinReset(req as any, res, next)
);

/**
 * @swagger
 * /api/auth/reset-pin:
 *   post:
 *     summary: Reset transaction PIN with code
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
 *         description: PIN reset
 */
router.post(
  '/reset-pin',
  authMiddleware as any,
  requirePassenger,
  (req, res, next) => authController.resetPin(req as any, res, next)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Reset email sent
 */
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset
 */
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email/phone verification code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Verification code resent
 */
router.post('/resend-verification', (req, res, next) => authController.resendVerificationCode(req, res, next));

export default router;