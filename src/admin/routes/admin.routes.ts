import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../../shared/middleware/auth.middleware';
import { requireClearance } from '../../shared/middleware/role.middleware';

const router = Router();

// Dashboard - Level 2 (Support and above)
router.get('/dashboard-stats', authMiddleware as any, requireClearance(2) as any, AdminController.getDashboardStats as any);

// User Management - Level 3 (Compliance/Operations and above)
router.get('/users', authMiddleware as any, requireClearance(3) as any, AdminController.getAllUsers as any);

// Financial Management - Level 4 (Finance and above)
router.get('/wallets', authMiddleware as any, requireClearance(4) as any, AdminController.getAllWallets as any);
router.get('/wallet-stats', authMiddleware as any, requireClearance(4) as any, AdminController.getWalletStats as any);

// Support & Ticketing - Level 2 (Support and above)
router.get('/tickets', authMiddleware as any, requireClearance(2) as any, AdminController.getAllTickets as any);
router.patch('/tickets/:id/resolve', authMiddleware as any, requireClearance(2) as any, AdminController.resolveTicket as any);

// Compliance & KYC - Level 3 (Compliance and above)
router.get('/kyc-pending', authMiddleware as any, requireClearance(3) as any, AdminController.getPendingKYC as any);
router.patch('/kyc/:agentId/approve', authMiddleware as any, requireClearance(3) as any, AdminController.approveKYC as any);
router.patch('/kyc/:agentId/reject', authMiddleware as any, requireClearance(3) as any, AdminController.rejectKYC as any);
router.get('/kyc-pending-users', authMiddleware as any, requireClearance(3) as any, AdminController.getPendingUserKYC as any);
router.patch('/kyc/users/:userId/approve', authMiddleware as any, requireClearance(3) as any, AdminController.approveUserKYC as any);
router.patch('/kyc/users/:userId/reject', authMiddleware as any, requireClearance(3) as any, AdminController.rejectUserKYC as any);

// Operations - Level 3 (Operations and above)
router.get('/agents', authMiddleware as any, requireClearance(3) as any, AdminController.getAgentPerformance as any);

export default router;