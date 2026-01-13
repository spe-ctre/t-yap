import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settings.service';
import { createError } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class SettingsController {
  private settingsService: SettingsService;

  constructor() {
    this.settingsService = new SettingsService();
  }

  // GET /api/settings
  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.settingsService.getUserSettings((req as AuthenticatedRequest).user!.id);
      res.json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/settings/notifications
  updateNotificationSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { pushNotification, emailNotification, smsNotification } = req.body;

      // Validate at least one field is provided
      if (
        pushNotification === undefined &&
        emailNotification === undefined &&
        smsNotification === undefined
      ) {
        throw createError('At least one notification setting must be provided', 400);
      }

      const settings = await this.settingsService.updateNotificationSettings(
        (req as AuthenticatedRequest).user!.id,
        { pushNotification, emailNotification, smsNotification }
      );

      res.json({
        success: true,
        data: settings,
        message: 'Notification preferences updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/settings/general
  updateGeneralSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { language, darkMode, biometricLogin } = req.body;

      // Validate at least one field is provided
      if (
        language === undefined &&
        darkMode === undefined &&
        biometricLogin === undefined
      ) {
        throw createError('At least one setting must be provided', 400);
      }

      // Validate language if provided
      if (language && !['en', 'ha', 'ig', 'yo'].includes(language)) {
        throw createError('Invalid language. Must be one of: en, ha, ig, yo', 400);
      }

      const settings = await this.settingsService.updateGeneralSettings(
        (req as AuthenticatedRequest).user!.id,
        { language, darkMode, biometricLogin }
      );

      res.json({
        success: true,
        data: settings,
        message: 'Settings updated successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}