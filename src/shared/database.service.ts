import { PrismaClient } from '@prisma/client';

/**
 * T-Yap High-Performance Database Service
 * 
 * Implements Read/Write Splitting & Connection Pooling.
 * - Writes go to the Primary (Master) database via PgBouncer.
 * - Reads are distributed across replicas (when available).
 */

class DatabaseService {
  public writeClient: PrismaClient;
  public readClient: PrismaClient;

  constructor() {
    // Primary Client (PgBouncer Pooled - for WRITES)
    this.writeClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL,
        },
      },
    });

    // Replica Client (Direct or Dedicated Replica - for READS)
    this.readClient = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL,
        },
      },
    });

    console.log('🏁 Database Service: Read/Write Splitting Enabled');
  }

  /**
   * Use for all mutation operations (CREATE, UPDATE, DELETE)
   */
  get master() {
    return this.writeClient;
  }

  /**
   * Use for all query operations (FIND, COUNT, AGGREGATE)
   */
  get replica() {
    return this.readClient;
  }

  async disconnect() {
    await Promise.all([
      this.writeClient.$disconnect(),
      this.readClient.$disconnect()
    ]);
  }
}

export const dbService = new DatabaseService();

// Export the existing prisma instance as 'legacy' to avoid breaking old code
// but we should migrate to dbService.master/replica for maximum speed.
export const prisma = dbService.writeClient;
