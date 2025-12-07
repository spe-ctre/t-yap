import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/signup', (req, res, next) => authController.signup(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/verify', authMiddleware as any, (req, res, next) => authController.verifyCode(req as any, res, next));
router.post('/create-pin', authMiddleware as any, (req, res, next) => authController.createPin(req as any, res, next));

export default router;