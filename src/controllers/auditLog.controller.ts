import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class AuditLogController {

  // Get all audit logs — SUPER_ADMIN only
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100 // Latest 100 logs
      });

      res.json({ success: true, statusCode: 200, data: logs });
    } catch (error) {
      next(error);
    }
  };
}

// Helper function to log actions from any controller
export const logAction = async (userId: string, action: string, details?: string) => {
    try {
      await prisma.auditLog.create({
        data: { userId, action, details }
      });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};