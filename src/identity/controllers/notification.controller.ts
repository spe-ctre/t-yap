/// <reference path="../../shared/types/express" />
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const unreadOnly = req.query.unreadOnly === 'true';
      const type = req.query.type as string | undefined;

      const userId = req.user!.id;

      const result = await this.notificationService.getNotifications(userId, {
        page,
        limit,
        unreadOnly,
        type
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await this.notificationService.getUnreadCount(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const result = await this.notificationService.markAsRead(userId, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const result = await this.notificationService.markAllAsRead(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const result = await this.notificationService.deleteNotification(userId, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}