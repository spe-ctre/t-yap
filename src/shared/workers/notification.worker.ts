import { Worker, Job } from 'bullmq';
import { appCache } from '../cache.service';
import { QueueName } from '../queue.service';
import { smsService } from '../../identity/services/sms.service';
import { emailService } from '../../identity/services/email.service';
import { pushNotificationService } from '../../identity/services/push-notification.service';

/**
 * T-Yap Notification Worker
 * 
 * Processes background jobs for SMS, Email, and Push Notifications.
 */

export const startNotificationWorker = () => {
  const redisClient = appCache.getRedisClient();
  if (!redisClient) return;

  const worker = new Worker(
    QueueName.NOTIFICATIONS,
    async (job: Job) => {
      const { type, phoneNumber, email, message, subject, userId, metadata } = job.data;
      
      console.log(`👷 Processing ${type} job ${job.id} for ${phoneNumber || email || userId}`);

      try {
        switch (type) {
          case 'SMS':
            if (phoneNumber) await smsService.sendSMS(phoneNumber, message);
            break;
          case 'EMAIL':
            if (email) await emailService.sendEmail(email, subject || 'T-Yap', message);
            break;
          case 'PUSH':
            if (userId) await pushNotificationService.sendToUser(userId, subject || 'T-Yap', message, metadata);
            break;
          default:
            console.warn(`⚠️ Unknown notification type: ${type}`);
        }
      } catch (error: any) {
        console.error(`❌ Job ${job.id} failed:`, error.message);
        throw error; // Rethrow to trigger BullMQ retry
      }
    },
    { 
      connection: redisClient,
      concurrency: 10, // Process 10 notifications at once per worker
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`🚨 Job ${job?.id} failed after retries:`, err.message);
  });

  return worker;
};
