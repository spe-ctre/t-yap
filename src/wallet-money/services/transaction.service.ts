// src/services/transaction.service.ts
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType, TransactionCategory, UserRole } from '@prisma/client';

// Re-export UserRole from Prisma for other services to use
export { UserRole } from '@prisma/client';

interface CreateTransactionInput {
  userId: string;
  userType: UserRole;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string;
  reference?: string; // Optional, auto-generated if missing
  metadata?: Record<string, any>;
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionInput) {
    const reference = data.reference || uuidv4();

    // Fetch user profile based on UserRole to calculate balances
    let balanceBefore = 0;

    if (data.userType === 'PASSENGER') {
      const passenger = await prisma.passenger.findUnique({
        where: { userId: data.userId }
      });
      balanceBefore = passenger?.walletBalance.toNumber() || 0;
    } else if (data.userType === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: data.userId }
      });
      balanceBefore = driver?.walletBalance.toNumber() || 0;
    } else if (data.userType === 'AGENT') {
      const agent = await prisma.agent.findUnique({
        where: { userId: data.userId }
      });
      balanceBefore = agent?.walletBalance.toNumber() || 0;
    }

    const balanceAfter =
      data.type === 'CREDIT' ? balanceBefore + data.amount : balanceBefore - data.amount;

    return prisma.transaction.create({
      data: {
        userId: data.userId,
        userType: data.userType,
        type: data.type,
        category: data.category,
        amount: data.amount,
        description: data.description,
        reference,
        balanceBefore,
        balanceAfter,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Get all transactions for a user
   */
  async getUserTransactions(userId: string) {
    return prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single transaction by reference for a specific user
   */
  async getTransactionByReference(reference: string, userId: string) {
    return prisma.transaction.findFirst({
      where: { reference, userId },
    });
  }

  /**
   * Process wallet top-up (Monnify or other providers)
   */
  async processTopup(
    provider: 'monnify' | 'paystack' | 'flutterwave' | 'manual',
    reference: string,
    metadata?: { userId: string; userType: UserRole }
  ) {
    const transaction = await prisma.transaction.findUnique({ where: { reference } });

    if (!transaction) throw new Error('Transaction not found');

    if (provider === 'monnify' && transaction.type === 'CREDIT' && metadata) {
      // Type-safe spread of metadata
      const updatedMetadata: Record<string, any> = {
        ...(typeof transaction.metadata === 'object' && transaction.metadata !== null
          ? transaction.metadata
          : {}),
        verified: true,
      };

      await prisma.transaction.update({
        where: { reference },
        data: { metadata: updatedMetadata },
      });

      // Increment wallet balance on the correct model based on UserRole
      if (metadata.userType === 'PASSENGER') {
        await prisma.passenger.update({
          where: { userId: metadata.userId },
          data: { walletBalance: { increment: transaction.amount } },
        });
      } else if (metadata.userType === 'DRIVER') {
        await prisma.driver.update({
          where: { userId: metadata.userId },
          data: { walletBalance: { increment: transaction.amount } },
        });
      } else if (metadata.userType === 'AGENT') {
        await prisma.agent.update({
          where: { userId: metadata.userId },
          data: { walletBalance: { increment: transaction.amount } },
        });
      }
    }

    return transaction;
  }
}