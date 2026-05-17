// src/services/wallet.service.ts

import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { MonnifyService } from './monnify.service';
import { TransactionType, TransactionCategory, TransactionStatus, UserRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { appCache } from './cache.service';

/**
 * WalletService - Handles all wallet-related operations
 */
export class WalletService {
  private monnifyService: MonnifyService | null = null;

  constructor() {
    try {
      this.monnifyService = new MonnifyService();
      // Only keep reference if Monnify is configured
      if (!this.monnifyService.isAvailable()) {
        this.monnifyService = null;
      }
    } catch (error) {
      // Monnify initialization failed, but we can still run without it
      console.warn('⚠️  Monnify service initialization failed. Wallet top-up will be disabled.');
      this.monnifyService = null;
    }
  }

  /**
   * Get the current wallet balance for a user
   */
  async getBalance(userId: string) {
    return appCache.getOrSet(
      `wallet-balance:${userId}`,
      async () => {
        const passenger = await prisma.passenger.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phoneNumber: true,
                role: true
              }
            }
          }
        });

        if (!passenger) {
          throw createError('Passenger wallet not found', 404);
        }

        return {
          userId: passenger.userId,
          balance: passenger.walletBalance.toNumber(),
          currency: 'NGN',
          role: passenger.user.role,
          updatedAt: passenger.updatedAt
        };
      },
      10, // 10s TTL
      `user-wallet:${userId}`
    );
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, limit: number = 10, offset: number = 0) {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          trip: {
            include: {
              route: true
            }
          },
          vasPurchase: {
            include: {
              serviceProvider: true
            }
          }
        }
      }),
      prisma.transaction.count({
        where: { userId }
      })
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
      hasMore: offset + limit < total
    };
  }

  /**
   * Initialize wallet top-up
   */
  async initializeTopUp(userId: string, amount: number) {
    if (!this.monnifyService || !this.monnifyService.isAvailable()) {
      throw createError('Wallet top-up is not available. Monnify payment service is not configured. Please contact support.', 503);
    }

    // Validate amount
    if (amount < 100) {
      throw createError('Minimum top-up amount is ₦100', 400);
    }

    if (amount > 1000000) {
      throw createError('Maximum top-up amount is ₦1,000,000', 400);
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        passenger: {
          select: {
            firstName: true,
            lastName: true,
            walletBalance: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Generate unique payment reference
    const paymentReference = `TOPUP_${Date.now()}_${userId.substring(0, 8)}`;

    // Get current balance
    const currentBalance = user.passenger?.walletBalance || new Decimal(0);

    // Create pending transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        userType: UserRole.PASSENGER,
        type: TransactionType.CREDIT,
        category: TransactionCategory.WALLET_TOPUP,
        amount: new Decimal(amount),
        balanceBefore: currentBalance,
        balanceAfter: currentBalance, // Will be updated after payment
        status: TransactionStatus.PENDING,
        description: `Wallet top-up of ₦${amount}`,
        reference: paymentReference,
        metadata: {
          paymentMethod: 'monnify',
          initiatedAt: new Date().toISOString()
        }
      }
    });

    // Initialize payment with Monnify
    const customerName = user.passenger?.firstName && user.passenger?.lastName
      ? `${user.passenger.firstName} ${user.passenger.lastName}`
      : user.email.split('@')[0];

    const paymentData = await this.monnifyService.initializePayment({
      amount,
      customerName,
      customerEmail: user.email,
      paymentReference,
      paymentDescription: `Wallet top-up for ${user.email}`,
    });

    // Update transaction with Monnify's own reference
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        metadata: {
          ...(transaction.metadata as any),
          monnifyReference: paymentData.transactionReference
        }
      }
    });

    return {
      transactionId: transaction.id,
      paymentReference,
      checkoutUrl: paymentData.checkoutUrl,
      amount,
      currency: 'NGN',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };
  }

  /**
   * Verify and complete top-up transaction
   */
  async verifyTopUp(userId: string, transactionReference: string) {
    if (!this.monnifyService || !this.monnifyService.isAvailable()) {
      throw createError('Wallet top-up verification is not available. Monnify payment service is not configured. Please contact support.', 503);
    }

    // Get the pending transaction
    // Get the pending transaction
    let transaction = await prisma.transaction.findFirst({
      where: {
        userId,
        status: TransactionStatus.PENDING,
        category: TransactionCategory.WALLET_TOPUP,
        OR: [
          { reference: transactionReference },
          { 
            metadata: {
              path: ['monnifyReference'],
              equals: transactionReference
            }
          }
        ]
      }
    });

    // FALLBACK: If not found by reference (e.g. using Monnify's ID for the first time), 
    // get the most recent pending top-up for this user
    if (!transaction) {
      transaction = await prisma.transaction.findFirst({
        where: {
          userId,
          status: TransactionStatus.PENDING,
          category: TransactionCategory.WALLET_TOPUP
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (!transaction) {
      throw createError('No pending top-up transaction found for this user', 404);
    }

    if (!transaction) {
      throw createError('Transaction not found or already processed', 404);
    }

    // Verify payment with Monnify
    const paymentData = await this.monnifyService.verifyPayment(transactionReference);

    // Check payment status
    if (paymentData.paymentStatus !== 'PAID') {
      // Keep PENDING if it's still in progress, mark FAILED only for terminal states.
      const terminalFailureStates = new Set(['FAILED', 'EXPIRED', 'CANCELLED', 'REVERSED']);
      const nextStatus = terminalFailureStates.has(paymentData.paymentStatus)
        ? TransactionStatus.FAILED
        : TransactionStatus.PENDING;

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: nextStatus,
          metadata: {
            ...(transaction.metadata as any),
            paymentStatus: paymentData.paymentStatus,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      throw createError(
        paymentData.paymentStatus === 'PENDING'
          ? 'Payment is still pending. Complete checkout and try again.'
          : 'Payment not completed',
        400
      );
    }

    // Verify amount matches
    const paidAmount = parseFloat(paymentData.amountPaid);
    const expectedAmount = transaction.amount.toNumber();

    if (Math.abs(paidAmount - expectedAmount) > 0.01) {
      throw createError('Payment amount mismatch', 400);
    }

    // Update wallet balance and transaction in a database transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Get current passenger data
      const passenger = await tx.passenger.findUnique({
        where: { userId }
      });

      if (!passenger) {
        throw createError('Passenger record not found', 404);
      }

      const currentBalance = passenger.walletBalance;
      const newBalance = currentBalance.add(transaction.amount);

      // Update passenger balance
      await tx.passenger.update({
        where: { userId },
        data: {
          walletBalance: newBalance
        }
      });

      // Update transaction status
      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: TransactionStatus.SUCCESS,
          balanceAfter: newBalance,
          metadata: {
            ...transaction.metadata as any,
            paymentStatus: paymentData.paymentStatus,
            paymentMethod: paymentData.paymentMethod,
            paidOn: paymentData.paidOn,
            verifiedAt: new Date().toISOString()
          }
        }
      });

      return {
        transaction: updatedTransaction,
        oldBalance: currentBalance.toNumber(),
        newBalance: newBalance.toNumber()
      };
    });

    return {
      success: true,
      message: 'Wallet top-up successful',
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount.toNumber(),
        reference: result.transaction.reference,
        status: result.transaction.status,
        createdAt: result.transaction.createdAt
      },
      balance: {
        previous: result.oldBalance,
        current: result.newBalance,
        currency: 'NGN'
      }
    };
  }

  /**
   * Get top-up transaction status
   */
  async getTopUpStatus(userId: string, transactionReference: string) {
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId,
        reference: transactionReference,
        category: TransactionCategory.WALLET_TOPUP
      },
      select: {
        id: true,
        amount: true,
        status: true,
        reference: true,
        createdAt: true,
        metadata: true
      }
    });

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    return transaction;
  }
}