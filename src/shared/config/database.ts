import { PrismaClient } from '@prisma/client';
import { appCache } from '../cache.service';

/**
 * T-Yap High-Performance Database Engine
 * 
 * Features:
 * 1. Connection Pooling (via PgBouncer)
 * 2. Read/Write Splitting ready
 * 3. Auto-Cache Invalidation
 */

const createExtendedClient = (url: string) => {
  const baseClient = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);

          // Auto-invalidate cache on write operations
          if (['create', 'update', 'delete', 'upsert', 'updateMany', 'deleteMany'].includes(operation)) {
            if (model === 'Passenger') {
              const userId = (args as any).where?.userId || (args as any).data?.userId;
              if (userId) await appCache.invalidateNamespace(`user-wallet:${userId}`);
            } else if (model === 'User') {
              const userId = (args as any).where?.id;
              if (userId) await appCache.delete(`profile:${userId}`);
            } else if (model === 'Notification') {
              const userId = (args as any).where?.userId || (args as any).data?.userId;
              if (userId) await appCache.invalidateNamespace(`user-notifications:${userId}`);
            } else if (model === 'Park') {
              await appCache.invalidateNamespace('parks');
            }
          }

          return result;
        },
      },
    },
  });
};

// WRITE CLIENT (Uses PgBouncer Pooler)
const writeUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL!;
export const prisma = createExtendedClient(writeUrl) as any;

// READ CLIENT (Ready for Replicas)
const readUrl = process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL!;
export const prismaRead = createExtendedClient(readUrl) as any;

/**
 * Gracefully disconnect all clients
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await Promise.all([
      (prisma as any).$disconnect?.(),
      (prismaRead as any).$disconnect?.()
    ]);
    console.log('🔌 Database engine disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting Database:', error);
  }
}