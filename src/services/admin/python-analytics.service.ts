import axios from 'axios';
import { prisma } from '../../config/database';

/**
 * Python Analytics Service
 * 
 * This service acts as a bridge between the Node.js backend and the 
 * Python-based Analytics Microservice.
 * All calls have a 3-second timeout to prevent dashboard hangs.
 */
export class PythonAnalyticsService {
  private static readonly PYTHON_API_URL = process.env.PYTHON_ANALYTICS_URL || 'https://tyap-analytics-engine.onrender.com/api/analytics';
  private static readonly TIMEOUT = 12000; // 12 second timeout (allows Render free tier cold starts)

  /**
   * Get KPI Delta Stats (Total Wallet, Revenue, Users, Success Rate)
   */
  static async getDeltaStats() {
    try {
      const response = await axios.get(`${this.PYTHON_API_URL}/delta-stats`, { timeout: this.TIMEOUT });
      return response.data;
    } catch (error) {
      console.error('Python delta-stats unavailable, using fallback');
      return this.getFallbackDeltaStats();
    }
  }

  /**
   * Get Revenue Projections
   */
  static async getRevenueProjections() {
    try {
      const transactionHistory = await prisma.transaction.findMany({
        where: { category: 'COMMISSION', status: 'SUCCESS' },
        take: 1000,
        orderBy: { createdAt: 'desc' }
      });

      const response = await axios.post(`${this.PYTHON_API_URL}/revenue-projections`, { history: transactionHistory }, { timeout: this.TIMEOUT });
      return response.data;
    } catch (error) {
      console.error('Python revenue-projections unavailable');
      return { projected: 0, confidence: 0 };
    }
  }

  /**
   * Get System Health Trend Data
   */
  static async getSystemHealthTrend(period: string = 'monthly') {
    try {
      const response = await axios.get(`${this.PYTHON_API_URL}/system-health`, { params: { period }, timeout: this.TIMEOUT });
      return response.data;
    } catch (error) {
      console.error('Python system-health unavailable, using fallback');
      return { success: true, data: [] };
    }
  }

  /**
   * Get Revenue Split Data
   */
  static async getRevenueSplit() {
    try {
      const response = await axios.get(`${this.PYTHON_API_URL}/revenue-split`, { timeout: this.TIMEOUT });
      return response.data;
    } catch (error) {
      console.error('Python revenue-split unavailable, using fallback');
      return { success: true, data: [] };
    }
  }

  /**
   * Fallback: Basic calculations in case the Python microservice is unavailable
   */
  private static getFallbackDeltaStats() {
    return {
      data: {
        totalWallet: { value: 0, delta: 0 },
        revenue: { value: 0, delta: 0 },
        totalUsers: { value: 0, delta: 0 },
        successRate: { value: 95, delta: 0 }
      }
    };
  }
}
