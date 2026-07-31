import { Queue, QueueEvents } from 'bullmq';
import { appCache } from './cache.service';

/**
 * T-Yap Background Task Engine (Queue Service)
 * 
 * Purpose: Offload heavy/non-blocking tasks to background workers
 * to ensure 10ms response times for the API.
 * 
 * Powered by BullMQ & Redis.
 */

export enum QueueName {
  NOTIFICATIONS = 'notifications',
  TRANSACTION_LOGS = 'transaction-logs',
  AUDIT_LOGS = 'audit-logs',
}

export class QueueService {
  private queues: Map<string, Queue> = new Map();
  private redisClient = appCache.getRedisClient();

  constructor() {
    if (this.redisClient) {
      console.log('👷 Background Task Engine Initialized (Redis Mode)');
      this.initQueues();
    } else {
      console.log('⚠️  Background Task Engine: Redis missing. Running in SYNC mode (Slow).');
    }
  }

  private initQueues() {
    Object.values(QueueName).forEach(name => {
      const queue = new Queue(name, {
        connection: this.redisClient!,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      });
      this.queues.set(name, queue);
    });
  }

  /**
   * Queue a notification (SMS, Email, or Push)
   */
  async sendNotification(data: {
    userId?: string;
    phoneNumber?: string;
    email?: string;
    type: 'SMS' | 'EMAIL' | 'PUSH';
    message: string;
    subject?: string;
    metadata?: any;
  }) {
    const queue = this.queues.get(QueueName.NOTIFICATIONS);
    
    if (queue) {
      // FIRE AND FORGET - Offload to background
      await queue.add('send', data);
      return { status: 'queued', jobId: 'async' };
    } else {
      // FALLBACK - SYNC (Import services dynamically to avoid circular dependencies)
      console.warn('⚠️  Redis unavailable, sending notification synchronously.');
      return this.sendSync(data);
    }
  }

  private async sendSync(data: any) {
    // This is the "safety net" if Redis is down
    try {
      if (data.type === 'SMS') {
        const { smsService } = await import('./sms.service');
        await smsService.sendSMS(data.phoneNumber || '', data.message);
      } else if (data.type === 'EMAIL') {
        const { emailService } = await import('./email.service');
        await emailService.sendEmail(data.email || '', data.subject || 'T-Yap Notification', data.message);
      }
      return { status: 'sent', mode: 'sync' };
    } catch (err) {
      console.error('❌ Sync fallback notification failed:', err);
      return { status: 'failed' };
    }
  }

  async shutdown() {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
  }
}

export const queueService = new QueueService();
