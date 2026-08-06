/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../shared/config/database';

export class PMNotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      return res.json({
        success: true,
        notifications: notifications.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          isRead: n.isRead,
          time: n.createdAt,
          type: n.type
        }))
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
      });
      return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  }
}
