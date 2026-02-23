import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';

const router = Router();
const auditLogController = new AuditLogController();

router.get('/', authMiddleware, isAdmin, auditLogController.getAuditLogs);

export default router;