import { Request, Response, NextFunction } from 'express';
import { PushNotificationService } from '../services/push-notification.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DeviceTokenController {
  private pushNotificationService: PushNotificationService;

  constructor() {
    this.pushNotificationService = new PushNotificationService();
  }

  // POST /api/device-tokens/register
  registerToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, platform } = req.body;

      if (!token || !platform) {
        throw createError('Token and platform are required', 400);
      }

      if (!['ios', 'android'].includes(platform)) {
        throw createError('Platform must be either "ios" or "android"', 400);
      }

      const deviceToken = await this.pushNotificationService.registerDeviceToken(
        (req as AuthenticatedRequest).user!.id,
        token,
        platform
      );

      res.json({
        success: true,
        data: deviceToken,
        message: 'Device token registered successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/device-tokens
  removeToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.body;

      if (!token) {
        throw createError('Token is required', 400);
      }

      await this.pushNotificationService.removeDeviceToken(token);

      res.json({
        success: true,
        message: 'Device token removed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/device-tokens
  getTokens = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await this.pushNotificationService.getUserTokens((req as AuthenticatedRequest).user!.id);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  };
}