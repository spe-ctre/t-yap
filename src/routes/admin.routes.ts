import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/role.middleware';

const router = Router();

const auth = [authMiddleware as any, isAdmin as any];

router.get('/dashboard-stats', ...auth, AdminController.getDashboardStats as any);
router.get('/users', ...auth, AdminController.getAllUsers as any);
router.get('/wallets', ...auth, AdminController.getAllWallets as any);
router.get('/wallet-stats', ...auth, AdminController.getWalletStats as any);
router.get('/tickets', ...auth, AdminController.getAllTickets as any);
router.patch('/tickets/:id/resolve', ...auth, AdminController.resolveTicket as any);
router.get('/kyc-pending', ...auth, AdminController.getPendingKYC as any);
router.patch('/kyc/:agentId/approve', ...auth, AdminController.approveKYC as any);
router.patch('/kyc/:agentId/reject', ...auth, AdminController.rejectKYC as any);
router.get('/agents', ...auth, AdminController.getAgentPerformance as any);

export default router;