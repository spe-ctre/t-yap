// src/services/withdrawal.service.ts

import { PrismaClient, TransactionStatus, TransactionType, TransactionCategory, UserType } from '@prisma/client';
import { AppError } from '../utils/errors';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';
import { initiateBankTransfer } from '../utils/monnify.utils';

const prisma = new PrismaClient();

interface WithdrawalRequest {
  userId: string;
  amount: number;
  bankAccountId?: string; // Optional, uses default if not provided
  pin: string;
  description?: string;
}

interface WithdrawalLimits {
  minAmount: number;
  maxAmountPerTransaction: number;
  maxDailyAmount: number;
  maxDailyTransactions: number;
}

export class WithdrawalService {
  // Withdrawal limits configuration
  private static readonly LIMITS: WithdrawalLimits = {
    minAmount: 100, // ₦100 minimum
    maxAmountPerTransaction: 500000, // ₦500K per transaction
    maxDailyAmount: 2000000, // ₦2M daily limit
    maxDailyTransactions: 20, // 20 withdrawals per day
  };

  // Withdrawal fee configuration
  private static readonly FEE_PERCENTAGE = 0.5; // 0.5% fee
  private static readonly FEE_CAP = 100; // Max ₦100 fee

  /**
   * Process withdrawal to bank account
   */
  static async processWithdrawal(data: WithdrawalRequest) {
    const { userId, amount, bankAccountId, pin, description } = data;

    // Start transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // 1. Get user with passenger profile
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { passenger: true },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (!user.passenger) {
        throw new AppError('Passenger profile not found', 400);
      }

      if (!user.passenger.transactionPin) {
        throw new AppError('Transaction PIN not set. Please set your PIN first.', 400);
      }

      // Verify PIN
      const isPinValid = await bcrypt.compare(pin, user.passenger.transactionPin);
      if (!isPinValid) {
        throw new AppError('Invalid transaction PIN', 401);
      }

      // 2. Get bank account (default or specified)
      let bankAccount;
      if (bankAccountId) {
        bankAccount = await tx.bankAccount.findUnique({
          where: { id: bankAccountId },
        });

        if (!bankAccount || bankAccount.userId !== userId) {
          throw new AppError('Bank account not found', 404);
        }
      } else {
        // Use default bank account
        bankAccount = await tx.bankAccount.findFirst({
          where: { userId, isDefault: true },
        });

        if (!bankAccount) {
          throw new AppError('No default bank account found. Please add a bank account first.', 404);
        }
      }

      if (!bankAccount.isVerified) {
        throw new AppError('Bank account is not verified', 400);
      }

      // Ensure bankCode is not null
      if (!bankAccount.bankCode) {
        throw new AppError('Bank account has invalid bank code', 400);
      }

      // 3. Validate amount
      this.validateWithdrawalAmount(amount);

      // 4. Check daily limits
      await this.checkDailyLimits(userId, amount, tx);

      // 5. Calculate fees
      const fee = this.calculateWithdrawalFee(amount);
      const totalDeduction = amount + fee;

      // 6. Check user has sufficient balance
      const userBalance = user.passenger.walletBalance.toNumber();
      if (userBalance < totalDeduction) {
        throw new AppError(
          `Insufficient balance. Required: ₦${totalDeduction.toFixed(2)}, Available: ₦${userBalance.toFixed(2)}`,
          400
        );
      }

      // 7. Generate unique reference
      const reference = this.generateWithdrawalReference();

      // 8. Deduct from user's wallet
      const newBalance = new Decimal(userBalance - totalDeduction);
      await tx.passenger.update({
        where: { id: user.passenger.id },
        data: {
          walletBalance: newBalance,
        },
      });

      // 9. Create debit transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
          userType: UserType.PASSENGER,
          type: TransactionType.DEBIT,
          category: TransactionCategory.TRANSFER, // Using TRANSFER for withdrawals
          amount: new Decimal(-totalDeduction),
          balanceBefore: new Decimal(userBalance),
          balanceAfter: newBalance,
          status: TransactionStatus.PROCESSING,
          reference,
          description: description || `Withdrawal to ${bankAccount.bankName} (${bankAccount.accountNumber})`,
          metadata: {
            withdrawalType: 'BANK_TRANSFER',
            bankAccountId: bankAccount.id,
            accountNumber: bankAccount.accountNumber,
            accountName: bankAccount.accountName,
            bankName: bankAccount.bankName,
            bankCode: bankAccount.bankCode,
            fee,
            amount,
          },
        },
      });

      // 10. If there's a fee, create fee transaction
      if (fee > 0) {
        await tx.transaction.create({
          data: {
            userId,
            userType: UserType.PASSENGER,
            type: TransactionType.DEBIT,
            category: TransactionCategory.TRANSFER,
            amount: new Decimal(-fee),
            balanceBefore: new Decimal(userBalance - amount),
            balanceAfter: newBalance,
            status: TransactionStatus.SUCCESS,
            reference,
            description: 'Withdrawal fee',
            metadata: {
              relatedTransactionId: transaction.id,
              feeType: 'WITHDRAWAL_FEE',
            },
          },
        });
      }

      // 11. Initiate bank transfer via Monnify (outside transaction to avoid long-running operations)
      let transferResult;
      try {
        transferResult = await initiateBankTransfer({
          amount,
          destinationAccountNumber: bankAccount.accountNumber,
          destinationBankCode: bankAccount.bankCode,
          destinationAccountName: bankAccount.accountName,
          narration: description || 'Wallet withdrawal',
          reference,
        });

        // Update transaction status to SUCCESS
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.SUCCESS,
            metadata: {
              ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
              monnifyResponse: transferResult,
              completedAt: new Date().toISOString(),
            },
          },
        });
      } catch (error: any) {
        // Rollback: Credit user's wallet back
        await prisma.passenger.update({
          where: { id: user.passenger.id },
          data: {
            walletBalance: new Decimal(userBalance),
          },
        });

        // Update transaction status to FAILED
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: TransactionStatus.FAILED,
            metadata: {
              ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
              error: error.message,
              failedAt: new Date().toISOString(),
            },
          },
        });

        throw new AppError('Withdrawal failed. Your balance has been restored.', 500);
      }

      // 12. Send notification
      await this.sendWithdrawalNotification(userId, amount, bankAccount.bankName, reference, tx);

      return {
        success: true,
        message: 'Withdrawal processed successfully',
        data: {
          transactionId: transaction.id,
          reference,
          amount,
          fee,
          totalDeducted: totalDeduction,
          bankAccount: {
            accountNumber: bankAccount.accountNumber,
            accountName: bankAccount.accountName,
            bankName: bankAccount.bankName,
          },
          newBalance: newBalance.toNumber(),
          timestamp: transaction.createdAt,
        },
      };
    });
  }

  /**
   * Validate withdrawal amount
   */
  private static validateWithdrawalAmount(amount: number): void {
    if (amount < this.LIMITS.minAmount) {
      throw new AppError(
        `Minimum withdrawal amount is ₦${this.LIMITS.minAmount}`,
        400
      );
    }

    if (amount > this.LIMITS.maxAmountPerTransaction) {
      throw new AppError(
        `Maximum withdrawal amount per transaction is ₦${this.LIMITS.maxAmountPerTransaction}`,
        400
      );
    }
  }

  /**
   * Check daily withdrawal limits
   */
  private static async checkDailyLimits(
    userId: string,
    amount: number,
    tx: any
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's withdrawals
    const todayWithdrawals = await tx.transaction.findMany({
      where: {
        userId,
        category: TransactionCategory.TRANSFER,
        createdAt: {
          gte: today,
        },
        type: TransactionType.DEBIT,
        status: {
          in: [TransactionStatus.SUCCESS, TransactionStatus.PROCESSING],
        },
        metadata: {
          path: ['withdrawalType'],
          equals: 'BANK_TRANSFER',
        },
      },
    });

    // Check daily transaction count
    if (todayWithdrawals.length >= this.LIMITS.maxDailyTransactions) {
      throw new AppError(
        `Daily withdrawal limit reached (${this.LIMITS.maxDailyTransactions} withdrawals)`,
        400
      );
    }

    // Check daily amount limit
    const todayTotal = todayWithdrawals.reduce(
      (sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()),
      0
    );

    if (todayTotal + amount > this.LIMITS.maxDailyAmount) {
      const remaining = this.LIMITS.maxDailyAmount - todayTotal;
      throw new AppError(
        `Daily withdrawal limit exceeded. Remaining: ₦${remaining.toFixed(2)}`,
        400
      );
    }
  }

  /**
   * Calculate withdrawal fee
   */
  private static calculateWithdrawalFee(amount: number): number {
    const feePercentage = this.FEE_PERCENTAGE;
    
    if (feePercentage <= 0) {
      return 0;
    }

    let fee = (amount * feePercentage) / 100;

    // Apply fee cap
    if (this.FEE_CAP > 0 && fee > this.FEE_CAP) {
      fee = this.FEE_CAP;
    }

    return Math.round(fee * 100) / 100;
  }

  /**
   * Generate unique withdrawal reference
   */
  private static generateWithdrawalReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `WDR${timestamp}${random}`;
  }

  /**
   * Get withdrawal limits
   */
  static getWithdrawalLimits(): WithdrawalLimits {
    return this.LIMITS;
  }

  /**
   * Get user's remaining daily withdrawal limit
   */
  static async getRemainingDailyLimit(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayWithdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        category: TransactionCategory.TRANSFER,
        createdAt: {
          gte: today,
        },
        type: TransactionType.DEBIT,
        status: {
          in: [TransactionStatus.SUCCESS, TransactionStatus.PROCESSING],
        },
        metadata: {
          path: ['withdrawalType'],
          equals: 'BANK_TRANSFER',
        },
      },
    });

    const todayTotal = todayWithdrawals.reduce(
      (sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()),
      0
    );

    return {
      dailyLimit: this.LIMITS.maxDailyAmount,
      usedToday: todayTotal,
      remainingToday: this.LIMITS.maxDailyAmount - todayTotal,
      withdrawalsToday: todayWithdrawals.length,
      remainingWithdrawals: this.LIMITS.maxDailyTransactions - todayWithdrawals.length,
    };
  }

  /**
   * Send withdrawal notification
   */
  private static async sendWithdrawalNotification(
    userId: string,
    amount: number,
    bankName: string,
    reference: string,
    tx: any
  ): Promise<void> {
    try {
      await tx.notification.create({
        data: {
          userId,
          type: 'TRANSACTION',
          title: 'Withdrawal Successful',
          message: `You successfully withdrew ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${bankName}`,
          metadata: {
            reference,
            amount,
            bankName,
            type: 'WITHDRAWAL',
          },
        },
      });
    } catch (error) {
      console.error('Failed to send withdrawal notification:', error);
    }
  }
}