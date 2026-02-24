import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class AuditLogController {
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.json({ success: true, statusCode: 200, data: logs });
    } catch (error) {
      next(error);
    }
  };
}

export const logAction = async (userId: string, action: string, details?: string) => {
  try {
    await prisma.auditLog.create({
      data: { userId, action, details }
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};