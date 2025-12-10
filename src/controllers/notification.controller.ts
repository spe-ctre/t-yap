import { Request, Response, NextFunction, RequestHandler } from 'express';
import { NotificationService } from '../services/notification.service';
import { UserRole } from '../middleware/auth.middleware';

/**
 * AuthenticatedRequest interface
 * Extends Express Request to include user information from JWT token
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  };
}

export class NotificationController {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  getNotifications = (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
  }) as RequestHandler;

  getUnreadCount = (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.getUnreadCount(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;

  markAsRead = (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.notificationService.markAsRead(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;

  markAllAsRead = (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await this.notificationService.markAllAsRead(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;

  deleteNotification = (async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.notificationService.deleteNotification(req.user.id, id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }) as RequestHandler;
}