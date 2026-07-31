import { Router } from 'express';
import { AdminFinanceController } from '../controllers/admin-finance.controller';
import { authenticateToken } from '../../shared/middleware/auth.middleware';
import { hasRole } from '../../shared/middleware/role.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Only SUPER_ADMIN and probably FINANCE_ADMIN (which might map to SUPER_ADMIN in Prisma for now or a custom role) can access this
// Currently T-Yap uses SUPER_ADMIN.
router.use(authenticateToken);
router.use(hasRole(UserRole.SUPER_ADMIN));

router.get('/settlements/pending', AdminFinanceController.getPendingSettlements);
router.post('/settlements/bulk-approve', AdminFinanceController.bulkApproveSettlements);

export default router;
