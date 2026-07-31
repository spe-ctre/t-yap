import { Router } from 'express';
import { TwoFactorController } from '../controllers/twoFactor.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const twoFactorController = new TwoFactorController();

// All routes require the user to be logged in
router.post('/setup', authMiddleware, twoFactorController.setup2FA);
router.post('/verify', authMiddleware, twoFactorController.verify2FA);
router.post('/validate', twoFactorController.validate2FA); // No auth — used during login flow
router.post('/disable', authMiddleware, twoFactorController.disable2FA);

export default router;