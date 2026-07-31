import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { NearbyController } from '../controllers/nearby.controller';

const router = Router();

// Optional: require auth for nearby searches
router.get('/', authMiddleware as any, NearbyController.getNearby);

export default router;
