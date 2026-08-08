/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMNotificationService } from '../services/pm-notification.service';

export class PMNotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const notifications = await PMNotificationService.getNotifications(userId);
      return res.json({ success: true, notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      await PMNotificationService.markAllAsRead(userId);
      return res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Mark read error:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  }
}