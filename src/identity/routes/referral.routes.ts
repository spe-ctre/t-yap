import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware as any);

router.get('/', ReferralController.getReferralInfo);
router.post('/apply', ReferralController.applyReferralCode);

export default router;
