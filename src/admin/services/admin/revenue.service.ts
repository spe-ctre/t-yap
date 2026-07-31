import { PrismaClient, TransactionType, TransactionCategory } from '@prisma/client';
import { createError } from '../../middleware/error.middleware';

const prisma = new PrismaClient();

export enum RevenueType {
  TRIP_FARE = 'TRIP_FARE',
  ONBOARDING = 'ONBOARDING',
  P2P_TRANSFER = 'P2P_TRANSFER',
  AIRTIME_DATA = 'AIRTIME_DATA'
}

export interface RevenueSplit {
  totalAmount: number;
  companyCut: number;
  pmCut: number;
  agentCut: number;
  driverFare: number;
}

export class RevenueService {
  /**
   * Calculate and distribute revenue based on transaction type
   */
  static async processRevenue(type: RevenueType, amount: number, metadata: any) {
    const split = this.calculateSplit(type, amount);
    
    return await prisma.$transaction(async (tx: any) => {
      // 1. Credit Company Wallet (Always present)
      await this.updateCompanyBalance(tx, split.companyCut);

      // 2. Distribute to specific roles based on type
      if (type === RevenueType.TRIP_FARE) {
        await this.handleTripRevenue(tx, split, metadata);
      } else if (type === RevenueType.ONBOARDING) {
        await this.handleOnboardingRevenue(tx, split, metadata);
      } else if (type === RevenueType.P2P_TRANSFER) {
        // P2P usually only has company charges
      }

      // 3. Log the revenue event for Admin Audit
      return await (tx.transaction as any).create({
        data: {
          type: TransactionType.CREDIT,
          category: 'REVENUE_SPLIT', // Using string to bypass enum lag
          amount: amount,
          description: `Revenue split for ${type}`,
          metadata: { ...metadata, split },
          userType: 'ADMIN', // Required field
          balanceBefore: 0,  // Required field
          balanceAfter: amount, // Required field
          reference: `REV-${Date.now()}`, // Required field
          user: { connect: { id: metadata.adminId || metadata.userId || 'system' } }
        }
      });
    });
  }

  /**
   * Smart Split Logic
   * Note: Rates should eventually be moved to a Config table managed by SuperAdmin
   */
  private static calculateSplit(type: RevenueType, amount: number): RevenueSplit {
    let splits = {
      totalAmount: amount,
      companyCut: 0,
      pmCut: 0,
      agentCut: 0,
      driverFare: 0
    };

    switch (type) {
      case RevenueType.TRIP_FARE:
        splits.companyCut = amount * 0.05; // 5%
        splits.pmCut = amount * 0.10;      // 10%
        splits.driverFare = amount * 0.85; // 85%
        break;
      
      case RevenueType.ONBOARDING:
        splits.companyCut = 200; // Fixed
        splits.pmCut = 100;      // Fixed
        splits.agentCut = 200;    // Fixed (Total onboarding ₦500)
        break;

      case RevenueType.P2P_TRANSFER:
        splits.companyCut = 10; // Simple service charge
        break;
    }

    return splits;
  }

  private static async updateCompanyBalance(tx: any, amount: number) {
    // Logic to update a central company treasury account
  }

  private static async handleTripRevenue(tx: any, split: RevenueSplit, metadata: any) {
    const { driverId, pmId } = metadata;
    
    // Update Driver Earnings (Withdrawable)
    await (tx.driver as any).update({
      where: { id: driverId },
      data: { walletBalance: { increment: split.driverFare } }
    });

    // Update PM Locked Balance (For monthly payout)
    await (tx.parkManager as any).update({
      where: { id: pmId },
      data: { lockedBalance: { increment: split.pmCut } }
    });
  }

  private static async handleOnboardingRevenue(tx: any, split: RevenueSplit, metadata: any) {
    const { agentId, pmId } = metadata;

    // Update Agent Locked Balance
    await (tx.agent as any).update({
      where: { id: agentId },
      data: { lockedBalance: { increment: split.agentCut } }
    });

    // Update PM Locked Balance
    await (tx.parkManager as any).update({
      where: { id: pmId },
      data: { lockedBalance: { increment: split.pmCut } }
    });
  }

  /**
   * Release locked funds into withdrawable balance
   * This is the "Monthly Salary" logic
   */
  static async releaseLockedFunds(role: 'AGENT' | 'PARK_MANAGER', id: string) {
    return await prisma.$transaction(async (tx: any) => {
      let user;
      if (role === 'AGENT') {
        user = await tx.agent.findUnique({ where: { id } });
      } else {
        user = await tx.parkManager.findUnique({ where: { id } });
      }

      if (!user || user.lockedBalance.isZero()) {
        throw createError('No locked funds available to release', 400);
      }

      const amountToRelease = user.lockedBalance;

      // Transfer from Locked to Withdrawable
      if (role === 'AGENT') {
        await (tx.agent as any).update({
          where: { id },
          data: {
            lockedBalance: 0,
            walletBalance: { increment: amountToRelease }
          }
        });
      } else {
        await (tx.parkManager as any).update({
          where: { id },
          data: {
            lockedBalance: 0,
            walletBalance: { increment: amountToRelease }
          }
        });
      }

      return {
        message: 'Locked funds released successfully',
        amount: amountToRelease,
        newWithdrawableBalance: Number(user.walletBalance) + Number(amountToRelease)
      };
    });
  }
}

