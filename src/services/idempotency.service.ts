import crypto from 'crypto';
import { prisma } from '../config/database';

export type IdempotencyStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export class IdempotencyService {
  private expiryHours: number;

  constructor() {
    this.expiryHours = parseInt(process.env.IDEMPOTENCY_KEY_EXPIRY_HOURS || '24', 10);
  }

  generateKey(userId: string, payload: unknown): string {
    const hash = this.hashPayload(payload);
    const timestamp = Date.now().toString();
    return `${userId}_${hash}_${timestamp}`;
  }

  hashPayload(payload: unknown): string {
    const json = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  async checkExisting(key: string) {
    return prisma.idempotencyKey.findUnique({
      where: { key }
    });
  }

  async createPending(userId: string, key: string, requestHash: string) {
    const expiresAt = new Date(Date.now() + this.expiryHours * 60 * 60 * 1000);
    return prisma.idempotencyKey.create({
      data: {
        key,
        userId,
        requestHash,
        status: 'PENDING',
        expiresAt
      }
    });
  }

  async markCompleted(key: string, response: unknown) {
    return prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: 'COMPLETED',
        response: response as any
      }
    });
  }

  async markFailed(key: string) {
    return prisma.idempotencyKey.update({
      where: { key },
      data: {
        status: 'FAILED'
      }
    });
  }

  async cleanupExpired() {
    return prisma.idempotencyKey.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
  }
}



