import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireClearance } from '../middleware/role.middleware';

const router = Router();
const auditLogController = new AuditLogController();

router.get('/', authMiddleware, requireClearance(3), auditLogController.getAuditLogs);

export default router;