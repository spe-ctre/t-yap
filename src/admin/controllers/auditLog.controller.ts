/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { prisma, prismaRead } from '../../shared/config/database';

export class AuditLogController {
  getAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use prismaRead for high-performance Read-Only access
      const logs = await prismaRead.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      // Fetch all unique user IDs from the logs
      const userIds = [...new Set(logs.map((log: any) => log.userId))];

      // Fetch users in a single batch
      const users = await prismaRead.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true }
      });

      // Create a map for quick lookup
      const emailMap = new Map<string, string>(
        users.map((u: { id: string, email: string }) => [u.id, u.email])
      );

      const formattedLogs = logs.map((log: any) => ({
        id: log.id,
        adminEmail: emailMap.get(log.userId) || 'Unknown',
        action: log.action,
        details: log.details || '',
        createdAt: log.createdAt
      }));

      res.json({ success: true, data: formattedLogs });
    } catch (error) {
      next(error);
    }
  };
}

export const logAction = async (userId: string, action: string, details?: string) => {
  try {
    // Mutations use the master prisma client (pooled via PgBouncer)
    await prisma.auditLog.create({
      data: { userId, action, details }
    });
  } catch (error) {
    console.error('Failed to log action:', error);
  }
};