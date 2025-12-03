import { messaging } from '../config/firebase';
import { prisma } from '../config/database';
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
    // Check if token already exists
    const existingToken = await prisma.deviceToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Update if it belongs to a different user or is inactive
      if (existingToken.userId !== userId || !existingToken.isActive) {
        await prisma.deviceToken.update({
          where: { token },
          data: {
            userId,
            platform,
            isActive: true,
          },
        });
      }
      return existingToken;
    }

    // Create new token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        userId,
        token,
        platform,
      },
    });

    return deviceToken;
  }

  // Remove a device token (logout)
  async removeDeviceToken(token: string) {
    await prisma.deviceToken.update({
      where: { token },
      data: { isActive: false },
    });
  }

  // Get all active tokens for a user
  async getUserTokens(userId: string) {
    return prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  // Send push notification to a specific user
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ) {
    // Check if user has push notifications enabled
    const hasPushEnabled = await this.settingsService.hasNotificationEnabled(userId, 'push');
    if (!hasPushEnabled) {
      console.log(`Push notifications disabled for user ${userId}`);
      return { success: false, reason: 'push_disabled' };
    }

    // Get user's device tokens
    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      console.log(`No device tokens found for user ${userId}`);
      return { success: false, reason: 'no_tokens' };
    }

    // Send to all user's devices
    const tokenStrings = tokens.map((t) => t.token);
    
    try {
      // Get messaging instance (throws if Firebase not initialized)
      const messagingInstance = messaging();
      
      const response = await messagingInstance.sendEachForMulticast({
        tokens: tokenStrings,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      });

      // Handle failed tokens (remove invalid ones)
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(tokenStrings[idx]);
          }
        });

        // Deactivate failed tokens
        await prisma.deviceToken.updateMany({
          where: { token: { in: failedTokens } },
          data: { isActive: false },
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      // Handle Firebase not initialized gracefully
      if (error?.message?.includes('Firebase is not initialized')) {
        console.warn('Push notification skipped: Firebase not configured');
        return { success: false, reason: 'firebase_not_configured' };
      }
      console.error('Error sending push notification:', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  // Send notification with both in-app and push
  async sendNotification(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      metadata?: any;
    }
  ) {
    // Create in-app notification
    await this.notificationService.createNotification({
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      metadata: data.metadata,
    });

    // Send push notification
    const pushResult = await this.sendToUser(userId, {
      title: data.title,
      body: data.message,
      data: {
        type: data.type,
        ...data.metadata,
      },
    });

    return pushResult;
  }

  // Broadcast to multiple users
  async sendToMultipleUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendToUser(userId, notification))
    );

    return results;
  }
}