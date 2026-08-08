/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';

import { prisma } from '../../shared/config/database';
import { logAction } from './auditLog.controller';
import { PythonAnalyticsService } from '../services/admin/python-analytics.service';

export class AdminController {
  static getDashboardStats = async (req: Request, res: Response) => {
    try {
      const [
        totalUsers,
        totalAgents,
        pendingKYC,
        openTickets,
        totalTransactions,
        pythonStats,
        revenueSplit,
        monthlyTrends,
        weeklyTrends,
        dailyTrends
      ] = await Promise.all([
        prisma.user.count(),
        prisma.agent.count({ where: { isActive: true } }),
        prisma.agent.count({ where: { kycStatus: 'PENDING' } }),
        prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
        PythonAnalyticsService.getDeltaStats(),
        PythonAnalyticsService.getRevenueSplit(),
        PythonAnalyticsService.getSystemHealthTrend('monthly'),
        PythonAnalyticsService.getSystemHealthTrend('weekly'),
        PythonAnalyticsService.getSystemHealthTrend('daily')
      ]);

      await logAction(req.user!.id, 'VIEWED_DASHBOARD_STATS');
      res.json({
        success: true,
        data: {
          totalUsers,
          totalAgents,
          pendingKYC,
          openTickets,
          totalTransactionVolume: totalTransactions._sum.amount || 0,
          analytics: pythonStats.data,
          revenueSplit: revenueSplit.data,
          healthTrends: {
            monthly: monthlyTrends.data || [],
            weekly: weeklyTrends.data || [],
            daily: dailyTrends.data || []
          }
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  };

  static getAllUsers = async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, phoneNumber: true, role: true, isEmailVerified: true, isPhoneVerified: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      await logAction(req.user!.id, 'VIEWED_ALL_USERS', `Total users: ${users.length}`);
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  };

  static getAllWallets = async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, walletBalance: true },
        orderBy: { walletBalance: 'desc' },
      });
      const totalBalance = users.reduce((sum: number, user: any) => sum + user.walletBalance, 0);
      await logAction(req.user!.id, 'VIEWED_ALL_WALLETS', `Total balance: ${totalBalance}`);
      res.json({ success: true, data: { wallets: users, totalBalance } });
    } catch (error) {
      console.error('Get wallets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch wallets' });
    }
  };

  static getWalletStats = async (req: Request, res: Response) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [inflow, outflow, totalBalance] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { type: 'CREDIT', status: 'SUCCESS', createdAt: { gte: today } },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { type: 'DEBIT', status: 'SUCCESS', createdAt: { gte: today } },
        }),
        prisma.user.aggregate({ _sum: { walletBalance: true } }),
      ]);

      await logAction(req.user!.id, 'VIEWED_WALLET_STATS');
      res.json({
        success: true,
        data: {
          inflow: inflow._sum.amount || 0,
          outflow: outflow._sum.amount || 0,
          reserved: 0,
          totalBalance: totalBalance._sum.walletBalance || 0,
        }
      });
    } catch (error) {
      console.error('Get wallet stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch wallet stats' });
    }
  };

  static getAllTickets = async (req: Request, res: Response) => {
    try {
      const tickets = await prisma.supportTicket.findMany({
        include: { user: { select: { email: true, phoneNumber: true } } },
        orderBy: { createdAt: 'desc' },
      });
      await logAction(req.user!.id, 'VIEWED_ALL_TICKETS', `Total tickets: ${tickets.length}`);
      res.json({ success: true, data: tickets });
    } catch (error) {
      console.error('Get tickets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
    }
  };

  static resolveTicket = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { resolutionNote } = req.body;

      if (!resolutionNote) {
        return res.status(400).json({ success: false, message: 'Resolution note is required' });
      }

      const ticket = await prisma.supportTicket.update({
        where: { id },
        data: { status: 'RESOLVED' },
      });

      await logAction(req.user!.id, 'RESOLVED_TICKET', `Ticket ${id}: ${resolutionNote}`);
      res.json({ success: true, data: ticket });
    } catch (error) {
      console.error('Resolve ticket error:', error);
      res.status(500).json({ success: false, message: 'Failed to resolve ticket' });
    }
  };

  static getPendingKYC = async (req: Request, res: Response) => {
    try {
      const agents = await prisma.agent.findMany({
        where: { kycStatus: 'PENDING' },
        include: { user: { select: { email: true, phoneNumber: true } } },
        orderBy: { createdAt: 'desc' },
      });
      await logAction(req.user!.id, 'VIEWED_PENDING_KYC', `Pending: ${agents.length}`);
      res.json({ success: true, data: agents });
    } catch (error) {
      console.error('Get pending KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pending KYC' });
    }
  };

  static approveKYC = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: { kycStatus: 'APPROVED', isActive: true },
      });
      await logAction(req.user!.id, 'APPROVED_KYC', `Agent ID: ${agentId}`);
      res.json({ success: true, data: agent });
    } catch (error) {
      console.error('Approve KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve KYC' });
    }
  };

  static rejectKYC = async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }

      const agent = await prisma.agent.update({
        where: { id: agentId },
        // isActive: false added explicitly - on a first-time review this is
        // already the default, but if an agent was previously approved and
        // is later re-reviewed and rejected, rejection should actually
        // deactivate them, not just flip the status label.
        data: { kycStatus: 'REJECTED', isActive: false },
      });
      await logAction(req.user!.id, 'REJECTED_KYC', `Agent ID: ${agentId} | Reason: ${reason}`);
      res.json({ success: true, data: agent });
    } catch (error) {
      console.error('Reject KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject KYC' });
    }
  };

  // ============================================
  // USER-LEVEL KYC (passengers/drivers via the generic /api/kyc/* flow -
  // separate from the agent-specific KYC above, which operates on the
  // Agent table). Previously nothing in the codebase ever approved these -
  // KYCService.verifyBVN/verifyNIN/uploadFaceImage/uploadDocument now
  // auto-approve when everything checks out cleanly via Dojah, and this
  // queue is the manual fallback for ambiguous (REVIEW) results, mirroring
  // the agent KYC queue above.
  // ============================================

  static getPendingUserKYC = async (req: Request, res: Response) => {
    try {
      // Every user defaults to kycStatus 'PENDING' at signup, so filtering
      // on that alone would surface everyone who's ever signed up, not just
      // people actually awaiting review. Require both uploads to exist too
      // - that's what "has actually submitted something to review" means.
      const users = await prisma.user.findMany({
        where: {
          kycStatus: 'PENDING',
          idDocumentUrl: { not: null },
          faceImageUrl: { not: null },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          role: true,
          bvn: true,
          nin: true,
          idDocumentUrl: true,
          faceImageUrl: true,
          kycVerificationLog: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      await logAction(req.user!.id, 'VIEWED_PENDING_USER_KYC', `Pending: ${users.length}`);
      res.json({ success: true, data: users });
    } catch (error) {
      console.error('Get pending user KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pending KYC' });
    }
  };

  static approveUserKYC = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'APPROVED' },
      });
      await logAction(req.user!.id, 'APPROVED_USER_KYC', `User ID: ${userId}`);
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Approve user KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to approve KYC' });
    }
  };

  static rejectUserKYC = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'REJECTED' },
      });
      await logAction(req.user!.id, 'REJECTED_USER_KYC', `User ID: ${userId} | Reason: ${reason}`);
      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Reject user KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject KYC' });
    }
  };

  static getAgentPerformance = async (req: Request, res: Response) => {
    try {
      const agents = await prisma.agent.findMany({
        where: { isActive: true },
        include: {
          user: { select: { email: true } },
          park: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      await logAction(req.user!.id, 'VIEWED_AGENT_PERFORMANCE', `Total agents: ${agents.length}`);
      res.json({ success: true, data: agents });
    } catch (error) {
      console.error('Get agent performance error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch agent performance' });
    }
  };
}