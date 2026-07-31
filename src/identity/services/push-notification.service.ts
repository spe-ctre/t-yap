import { messaging } from '../../shared/config/firebase';
import { prisma } from '../../shared/config/database';
import { NotificationType } from '@prisma/client';
import { SettingsService } from './settings.service';
import { NotificationService } from './notification.service';

export class PushNotificationService {
  private settingsService: SettingsService;
  private notificationService: NotificationService;

  constructor() {
    this.settingsService = new SettingsService();
    this.notificationService = new NotificationService();
  }

  // Register a device token for push notifications
  async registerDeviceToken(userId: string, token: string, platform: 'ios' | 'android') {
    const existingToken = await prisma.deviceToken.findUnique({ where: { token } });

    if (existingToken) {
      if (existingToken.userId !== userId || !existingToken.isActive) {
        await prisma.deviceToken.update({
          where: { token },
          data: { userId, platform, isActive: true },
        });
      }
      return existingToken;
    }

    return prisma.deviceToken.create({
      data: { userId, token, platform },
    });
  }

  async removeDeviceToken(token: string) {
    await prisma.deviceToken.update({
      where: { token },
      data: { isActive: false },
    });
  }

  async getUserTokens(userId: string) {
    return prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });
  }

  /**
   * Enhanced sendToUser with flexible arguments
   */
  async sendToUser(
    userId: string,
    titleOrNotification: string | { title: string; body: string; data?: any },
    body?: string,
    data?: any
  ) {
    const title = typeof titleOrNotification === 'string' ? titleOrNotification : titleOrNotification.title;
    const finalBody = typeof titleOrNotification === 'string' ? body : titleOrNotification.body;
    const finalData = typeof titleOrNotification === 'string' ? data : titleOrNotification.data;

    // Check if user has push notifications enabled
    const hasPushEnabled = await this.settingsService.hasNotificationEnabled(userId, 'push');
    if (!hasPushEnabled) return { success: false, reason: 'push_disabled' };

    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) return { success: false, reason: 'no_tokens' };

    const tokenStrings = tokens.map((t) => t.token);
    
    try {
      const messagingInstance = messaging();
      if (!messagingInstance) {
        console.warn('⚠️  [SIMULATION] Push:', { to: userId, title, body: finalBody });
        return { success: true, reason: 'simulated' };
      }
      
      const response = await messagingInstance.sendEachForMulticast({
        tokens: tokenStrings,
        notification: { title, body: finalBody },
        data: finalData || {},
        android: {
          priority: 'high',
          notification: { sound: 'default', channelId: 'default' },
        },
        apns: {
          payload: { aps: { sound: 'default', badge: 1 } },
        },
      });

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) failedTokens.push(tokenStrings[idx]);
        });
        await prisma.deviceToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { isActive: false },
        });
      }

      return { success: true, successCount: response.successCount };
    } catch (error: any) {
      console.error('Error sending push notification:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendNotification(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: any;
    }
  ) {
    await this.notificationService.createNotification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    });

    return this.sendToUser(userId, {
      title: data.title,
      body: data.message,
      data: { type: data.type, ...data.metadata },
    });
  }

  async sendToMultipleUsers(
    userIds: string[],
    notification: { title: string; body: string; data?: Record<string, string> }
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, notification))
    );
    return results;
  }
}

export const pushNotificationService = new PushNotificationService();