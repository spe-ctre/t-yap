import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';
import { createError } from '../middleware/error.middleware';

export class NotificationService {
  
  async getNotifications(userId: string, options: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (options.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where })
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false }
    });
    return { unreadCount: count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw createError('Notification not found', 404);
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      throw createError('Notification not found', 404);
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { message: 'Notification deleted' };
  }

  // Helper method for other services to create notifications
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: any;
  }) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || null
      }
    });

    return notification;
  }
}