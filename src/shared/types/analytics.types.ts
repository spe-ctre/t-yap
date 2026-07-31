// src/types/analytics.types.ts

/**
 * Summary of transaction totals and statistics
 */
export interface TransactionSummary {
    totalIncome: number;
    totalExpenses: number;
    netBalance: number;
    transactionCount: number;
    averageTransaction: number;
    largestTransaction: number;
    smallestTransaction: number;
  }
  
  /**
   * Spending breakdown by category
   */
  export interface CategoryBreakdown {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }
  
  /**
   * Transaction trends over time
   */
  export interface TrendData {
    date: string;
    income: number;
    expenses: number;
    count: number;
  }
  
  /**
   * Spending patterns by day of week
   */
  export interface SpendingPattern {
    dayOfWeek: string;
    averageAmount: number;
    transactionCount: number;
  }
  
  /**
   * Top transaction recipients
   */
  export interface TopRecipient {
    recipientId: string;
    recipientEmail: string;
    totalAmount: number;
    transactionCount: number;
  }
  
  /**
   * Time period for analytics queries
   */
  export interface AnalyticsPeriod {
    startDate: Date;
    endDate: Date;
    period: 'day' | 'week' | 'month' | 'year' | 'custom';
  }
  
  /**
   * Complete analytics export data
   */
  export interface ExportData {
    summary: TransactionSummary;
    categories: CategoryBreakdown[];
    trends: TrendData[];
    period: AnalyticsPeriod;
    generatedAt: Date;
  }