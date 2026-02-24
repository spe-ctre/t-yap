import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export class AuditLogController {
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const logsWithEmail = await Promise.all(
        logs.map(async (log) => {
          const user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { email: true },
          });
          return { ...log, adminEmail: user?.email || 'Unknown' };
        })
      );

      res.json({ success: true, statusCode: 200, data: logsWithEmail });
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