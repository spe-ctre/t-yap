import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { logAction } from './auditLog.controller';

export class AdminController {
  static getDashboardStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [totalUsers, totalAgents, pendingKYC, openTickets, totalTransactions] = await Promise.all([
        prisma.user.count(),
        prisma.agent.count({ where: { isActive: true } }),
        prisma.agent.count({ where: { kycStatus: 'PENDING' } }),
        prisma.supportTicket.count({ where: { status: 'OPEN' } }),
        prisma.transaction.aggregate({ _sum: { amount: true }, where: { status: 'SUCCESS' } }),
      ]);
      await logAction(req.user!.id, 'VIEWED_DASHBOARD_STATS');
      res.json({
        success: true,
        data: {
          totalUsers, totalAgents, pendingKYC, openTickets,
          totalTransactionVolume: totalTransactions._sum.amount || 0,
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  };

  static getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
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

  static getAllWallets = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, role: true, walletBalance: true },
        orderBy: { walletBalance: 'desc' },
      });
      const totalBalance = users.reduce((sum, user) => sum + user.walletBalance, 0);
      await logAction(req.user!.id, 'VIEWED_ALL_WALLETS', `Total balance: ${totalBalance}`);
      res.json({ success: true, data: { wallets: users, totalBalance } });
    } catch (error) {
      console.error('Get wallets error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch wallets' });
    }
  };

  static getWalletStats = async (req: AuthenticatedRequest, res: Response) => {
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

  static getAllTickets = async (req: AuthenticatedRequest, res: Response) => {
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

  static resolveTicket = async (req: AuthenticatedRequest, res: Response) => {
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

  static getPendingKYC = async (req: AuthenticatedRequest, res: Response) => {
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

  static approveKYC = async (req: AuthenticatedRequest, res: Response) => {
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

  static rejectKYC = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { agentId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }

      const agent = await prisma.agent.update({
        where: { id: agentId },
        data: { kycStatus: 'REJECTED' },
      });
      await logAction(req.user!.id, 'REJECTED_KYC', `Agent ID: ${agentId} | Reason: ${reason}`);
      res.json({ success: true, data: agent });
    } catch (error) {
      console.error('Reject KYC error:', error);
      res.status(500).json({ success: false, message: 'Failed to reject KYC' });
    }
  };

  static getAgentPerformance = async (req: AuthenticatedRequest, res: Response) => {
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