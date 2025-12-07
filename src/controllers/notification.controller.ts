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

      const result = await this.notificationService.getNotifications(req.user.id, {
        page,
        limit,
        unreadOnly
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.getUnreadCount(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.notificationService.markAsRead(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.markAllAsRead(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.notificationService.deleteNotification(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };
}