// src/services/transaction-analytics.service.ts

import { PrismaClient, TransactionStatus, TransactionType, TransactionCategory } from '@prisma/client';
import {
  TransactionSummary,
  CategoryBreakdown,
  TrendData,
  SpendingPattern,
  TopRecipient,
  AnalyticsPeriod,
  ExportData,
} from '../types/analytics.types';

const prisma = new PrismaClient();

export class TransactionAnalyticsService {
  /**
   * Get transaction summary for a user
   */
  static async getTransactionSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionSummary> {
    const whereClause: any = {
      userId,
      status: TransactionStatus.SUCCESS,
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
    });

    if (transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        transactionCount: 0,
        averageTransaction: 0,
        largestTransaction: 0,
        smallestTransaction: 0,
      };
    }

    const income = transactions
      .filter((t) => t.type === TransactionType.CREDIT)
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const expenses = transactions
      .filter((t) => t.type === TransactionType.DEBIT)
      .reduce((sum, t) => sum + t.amount.toNumber(), 0);

    const amounts = transactions.map((t) => t.amount.toNumber());

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netBalance: income - expenses,
      transactionCount: transactions.length,
      averageTransaction: transactions.length > 0 ? (income + expenses) / transactions.length : 0,
      largestTransaction: Math.max(...amounts),
      smallestTransaction: Math.min(...amounts),
    };
  }

  /**
   * Get category breakdown
   */
  static async getCategoryBreakdown(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryBreakdown[]> {
    const whereClause: any = {
      userId,
      status: TransactionStatus.SUCCESS,
      type: TransactionType.DEBIT, // Only expenses
    };

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
    });

    // Group by category
    const categoryMap = new Map<string, { amount: number; count: number }>();

    transactions.forEach((t) => {
      const category = t.category;
      const existing = categoryMap.get(category) || { amount: 0, count: 0 };
      categoryMap.set(category, {
        amount: existing.amount + t.amount.toNumber(),
        count: existing.count + 1,
      });
    });

    const totalAmount = Array.from(categoryMap.values()).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    // Convert to array with percentage
    const breakdown: CategoryBreakdown[] = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      })
    );

    // Sort by amount descending
    return breakdown.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Get transaction trends over time
   */
  static async getTransactionTrends(
    userId: string,
    period: 'day' | 'week' | 'month' = 'week'
  ): Promise<TrendData[]> {
    const now = new Date();
    let startDate = new Date();

    // Calculate start date based on period
    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 7); // Last 7 days
        break;
      case 'week':
        startDate.setDate(now.getDate() - 30); // Last 30 days
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 12); // Last 12 months
        break;
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.SUCCESS,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date
    const trendMap = new Map<string, { income: number; expenses: number; count: number }>();

    transactions.forEach((t) => {
      const dateKey = this.getDateKey(t.createdAt, period);
      const existing = trendMap.get(dateKey) || { income: 0, expenses: 0, count: 0 };

      if (t.type === TransactionType.CREDIT) {
        existing.income += t.amount.toNumber();
      } else {
        existing.expenses += t.amount.toNumber();
      }
      existing.count += 1;

      trendMap.set(dateKey, existing);
    });

    // Convert to array
    const trends: TrendData[] = Array.from(trendMap.entries()).map(([date, data]) => ({
      date,
      income: data.income,
      expenses: data.expenses,
      count: data.count,
    }));

    return trends;
  }

  /**
   * Get spending patterns by day of week
   */
  static async getSpendingPatterns(
    userId: string,
    days: number = 30
  ): Promise<SpendingPattern[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.SUCCESS,
        type: TransactionType.DEBIT,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Group by day of week
    const dayMap = new Map<number, { totalAmount: number; count: number }>();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    transactions.forEach((t) => {
      const dayOfWeek = new Date(t.createdAt).getDay();
      const existing = dayMap.get(dayOfWeek) || { totalAmount: 0, count: 0 };
      dayMap.set(dayOfWeek, {
        totalAmount: existing.totalAmount + t.amount.toNumber(),
        count: existing.count + 1,
      });
    });

    // Convert to array
    const patterns: SpendingPattern[] = [];
    for (let i = 0; i < 7; i++) {
      const data = dayMap.get(i) || { totalAmount: 0, count: 0 };
      patterns.push({
        dayOfWeek: daysOfWeek[i],
        averageAmount: data.count > 0 ? data.totalAmount / data.count : 0,
        transactionCount: data.count,
      });
    }

    return patterns;
  }

  /**
   * Get top recipients/merchants
   */
  static async getTopRecipients(
    userId: string,
    limit: number = 10
  ): Promise<TopRecipient[]> {
    const transfers = await prisma.transfer.findMany({
      where: {
        senderId: userId,
        status: 'COMPLETED',
      },
      include: {
        recipient: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Group by recipient
    const recipientMap = new Map<string, { email: string; totalAmount: number; count: number }>();

    transfers.forEach((t) => {
      const recipientId = t.recipientId;
      const existing = recipientMap.get(recipientId) || {
        email: t.recipient.email,
        totalAmount: 0,
        count: 0,
      };
      recipientMap.set(recipientId, {
        email: existing.email,
        totalAmount: existing.totalAmount + t.amount.toNumber(),
        count: existing.count + 1,
      });
    });

    // Convert to array and sort
    const recipients: TopRecipient[] = Array.from(recipientMap.entries())
      .map(([recipientId, data]) => ({
        recipientId,
        recipientEmail: data.email,
        totalAmount: data.totalAmount,
        transactionCount: data.count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);

    return recipients;
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ExportData> {
    const summary = await this.getTransactionSummary(userId, startDate, endDate);
    const categories = await this.getCategoryBreakdown(userId, startDate, endDate);
    const trends = await this.getTransactionTrends(userId, 'month');

    return {
      summary,
      categories,
      trends,
      period: {
        startDate: startDate || new Date(0),
        endDate: endDate || new Date(),
        period: 'custom',
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Helper: Get date key for grouping
   */
  private static getDateKey(date: Date, period: 'day' | 'week' | 'month'): string {
    const d = new Date(date);
    switch (period) {
      case 'day':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'week':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'month':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      default:
        return d.toISOString().split('T')[0];
    }
  }
}