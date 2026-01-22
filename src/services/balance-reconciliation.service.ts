// src/services/balance-reconciliation.service.ts

import { PrismaClient, UserRole, TransactionStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database'; // Use shared instance

interface ReconciliationResult {
  userId: string;
  userType: UserRole;
  calculatedBalance: number;
  currentBalance: number;
  discrepancy: number;
  isReconciled: boolean;
  transactionCount: number;
}

export class BalanceReconciliationService {
  /**
   * Reconcile balance for a single user
   * Compares calculated balance from transactions vs actual wallet balance
   */
  static async reconcileUserBalance(
    userId: string,
    userType: UserRole
  ): Promise<ReconciliationResult> {
    // Get user's profile based on type
    let currentBalance = 0;
    let userProfile = null;

    switch (userType) {
      case UserRole.PASSENGER:
        userProfile = await prisma.passenger.findUnique({
          where: { userId },
        });
        currentBalance = userProfile?.walletBalance.toNumber() || 0;
        break;
      case UserRole.DRIVER:
        userProfile = await prisma.driver.findUnique({
          where: { userId },
        });
        currentBalance = userProfile?.walletBalance.toNumber() || 0;
        break;
      case UserRole.AGENT:
        userProfile = await prisma.agent.findUnique({
          where: { userId },
        });
        currentBalance = userProfile?.walletBalance.toNumber() || 0;
        break;
      case UserRole.PARK_MANAGER:
        // Park managers might not have wallet balance
        console.warn(`Skipping reconciliation for PARK_MANAGER: ${userId}`);
        throw new Error(`Reconciliation not supported for PARK_MANAGER`);
      default:
        throw new Error(`Unknown user type: ${UserRole}`);
    }

    if (!userProfile) {
      throw new Error(`User profile not found for userId: ${userId}`);
    }

    // Calculate balance from all successful transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.SUCCESS,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Sum all transaction amounts (CREDIT adds, DEBIT subtracts)
    const calculatedBalance = transactions.reduce((sum, tx) => {
      if (tx.type === TransactionType.CREDIT) {
        return sum + tx.amount.toNumber();
      } else {
        return sum - tx.amount.toNumber();
      }
    }, 0);

    // Calculate discrepancy
    const discrepancy = Math.abs(currentBalance - calculatedBalance);
    const isReconciled = discrepancy < 0.01; // Allow 1 kobo tolerance for rounding

    // Create balance history snapshot
    await prisma.balanceHistory.create({
      data: {
        userId,
        userType,
        balance: new Decimal(currentBalance),
        reconciled: isReconciled,
        discrepancy: isReconciled ? null : new Decimal(discrepancy),
        metadata: {
          calculatedBalance,
          transactionCount: transactions.length,
          reconciledAt: new Date().toISOString(),
        },
      },
    });

    return {
      userId,
      userType,
      calculatedBalance,
      currentBalance,
      discrepancy,
      isReconciled,
      transactionCount: transactions.length,
    };
  }

  /**
   * Reconcile all users' balances
   * Run this as a daily cron job
   */
  static async reconcileAllBalances(): Promise<{
    totalUsers: number;
    reconciled: number;
    discrepancies: number;
    results: ReconciliationResult[];
  }> {
    const results: ReconciliationResult[] = [];
    const errors: { userId: string; error: string }[] = [];

    try {
      // Get all users with wallet balances
      const [passengers, drivers, agents] = await Promise.all([
        prisma.passenger.findMany({ select: { userId: true } }),
        prisma.driver.findMany({ select: { userId: true } }),
        prisma.agent.findMany({ select: { userId: true } }),
      ]);

      // Process passengers in batches
      const passengerResults = await this.reconcileBatch(
        passengers.map(p => ({ userId: p.userId, userType: UserRole.PASSENGER }))
      );
      results.push(...passengerResults.results);
      errors.push(...passengerResults.errors);

      // Process drivers in batches
      const driverResults = await this.reconcileBatch(
        drivers.map(d => ({ userId: d.userId, userType: UserRole.DRIVER }))
      );
      results.push(...driverResults.results);
      errors.push(...driverResults.errors);

      // Process agents in batches
      const agentResults = await this.reconcileBatch(
        agents.map(a => ({ userId: a.userId, userType: UserRole.AGENT }))
      );
      results.push(...agentResults.results);
      errors.push(...agentResults.errors);

      // Log errors if any
      if (errors.length > 0) {
        console.error(`Reconciliation errors for ${errors.length} users:`, errors);
      }

      const reconciled = results.filter((r) => r.isReconciled).length;
      const discrepancies = results.filter((r) => !r.isReconciled).length;

      return {
        totalUsers: results.length,
        reconciled,
        discrepancies,
        results,
      };
    } catch (error) {
      console.error('Fatal error in reconcileAllBalances:', error);
      throw error;
    }
  }

  /**
   * Reconcile users in batches for better performance
   */
  private static async reconcileBatch(
    users: { userId: string; userType: UserRole }[]
  ): Promise<{
    results: ReconciliationResult[];
    errors: { userId: string; error: string }[];
  }> {
    const BATCH_SIZE = 10; // Process 10 users at a time
    const results: ReconciliationResult[] = [];
    const errors: { userId: string; error: string }[] = [];

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.allSettled(
        batch.map(user => this.reconcileUserBalance(user.userId, user.userType))
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push({
            userId: batch[index].userId,
            error: result.reason?.message || 'Unknown error'
          });
        }
      });
    }

    return { results, errors };
  }

  /**
   * Get balance history for a user
   */
  static async getUserBalanceHistory(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ) {
    const { startDate, endDate, limit = 30 } = options || {};

    const whereClause: any = { userId };

    if (startDate || endDate) {
      whereClause.snapshotDate = {};
      if (startDate) whereClause.snapshotDate.gte = startDate;
      if (endDate) whereClause.snapshotDate.lte = endDate;
    }

    const history = await prisma.balanceHistory.findMany({
      where: whereClause,
      orderBy: {
        snapshotDate: 'desc',
      },
      take: limit,
    });

    return history.map((record) => ({
      id: record.id,
      balance: record.balance.toNumber(),
      snapshotDate: record.snapshotDate,
      reconciled: record.reconciled,
      discrepancy: record.discrepancy?.toNumber() || null,
      metadata: record.metadata,
    }));
  }

  /**
   * Get balance trends for a user
   */
  static async getUserBalanceTrends(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const history = await this.getUserBalanceHistory(userId, {
      startDate,
      limit: days,
    });

    if (history.length === 0) {
      return {
        currentBalance: 0,
        highestBalance: 0,
        lowestBalance: 0,
        averageBalance: 0,
        balanceChange: 0,
        percentageChange: 0,
        dataPoints: [],
      };
    }

    const balances = history.map((h) => h.balance);
    const currentBalance = balances[0] || 0;
    const oldestBalance = balances[balances.length - 1] || 0;

    const highestBalance = Math.max(...balances);
    const lowestBalance = Math.min(...balances);
    const averageBalance =
      balances.reduce((sum, b) => sum + b, 0) / balances.length;
    const balanceChange = currentBalance - oldestBalance;
    const percentageChange =
      oldestBalance !== 0 ? (balanceChange / oldestBalance) * 100 : 0;

    return {
      currentBalance,
      highestBalance,
      lowestBalance,
      averageBalance: Math.round(averageBalance * 100) / 100,
      balanceChange: Math.round(balanceChange * 100) / 100,
      percentageChange: Math.round(percentageChange * 100) / 100,
      dataPoints: history.reverse(), // Oldest first for charts
    };
  }

  /**
   * Get users with balance discrepancies
   */
  static async getUsersWithDiscrepancies() {
    const recentDiscrepancies = await prisma.balanceHistory.findMany({
      where: {
        reconciled: false,
        snapshotDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        discrepancy: 'desc',
      },
    });

    return recentDiscrepancies.map((record) => ({
      userId: record.userId,
      userEmail: record.user.email,
      userPhone: record.user.phoneNumber,
      userType: record.userType,
      balance: record.balance.toNumber(),
      discrepancy: record.discrepancy?.toNumber() || 0,
      snapshotDate: record.snapshotDate,
      metadata: record.metadata,
    }));
  }
}