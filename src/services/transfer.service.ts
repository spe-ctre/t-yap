// src/services/transfer.service.ts

import { prisma } from '../config/database';
import { TransactionStatus, TransactionType, TransactionCategory, UserRole, TransferStatus } from '@prisma/client';
import { AppError } from '../utils/errors';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';
import { logAction } from '../controllers/auditLog.controller';
import { PushNotificationService } from './push-notification.service';

const HIGH_VALUE_THRESHOLD = 50000;

interface TransferRequest {
  senderId: string;
  recipientId: string;
  amount: number;
  description?: string;
  pin: string;
}

interface TransferLimits {
  minAmount: number;
  maxAmountPerTransaction: number;
  maxDailyAmount: number;
  maxDailyTransactions: number;
}

export class TransferService {
  // Transfer limits configuration
  private static readonly LIMITS: TransferLimits = {
    minAmount: 100, // ₦100 minimum
    maxAmountPerTransaction: 1000000, // ₦1M per transaction
    maxDailyAmount: 5000000, // ₦5M daily limit
    maxDailyTransactions: 50, // 50 transactions per day
  };

  // Transfer fee configuration (if applicable)
  private static readonly FEE_PERCENTAGE = 0; // 0% fee for now
  private static readonly FEE_CAP = 0; // No fee cap for now

  /**
   * Process peer-to-peer transfer
   */
  static async processTransfer(data: TransferRequest) {
    const { senderId, recipientId, amount, description, pin } = data;

    // 1. Get sender (user + passenger profile) OUTSIDE transaction for PIN check
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { passenger: true },
    });

    if (!sender) {
      throw new AppError('Sender not found', 404);
    }

    if (!sender.passenger) {
      throw new AppError('Sender does not have a passenger profile', 400);
    }

    if (!sender.passenger.transactionPin) {
      throw new AppError('Transaction PIN not set. Please set your PIN first.', 400);
    }

    // Verify PIN outside transaction to avoid blocking DB
    const isPinValid = await bcrypt.compare(pin, sender.passenger.transactionPin);
    if (!isPinValid) {
      throw new AppError('Invalid transaction PIN', 401);
    }

    if (senderId === recipientId) {
      throw new AppError('Cannot transfer to yourself', 400);
    }

    // Validate amount limits
    this.validateTransferAmount(amount);

    // 2. Get recipient (user + passenger profile)
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      include: { passenger: true },
    });

    if (!recipient) {
      throw new AppError('Recipient not found', 404);
    }

    if (!recipient.passenger) {
      throw new AppError('Recipient does not have a passenger profile', 400);
    }

    // Start transaction for atomic updates only
    return await prisma.$transaction(async (tx) => {
      // 4. Check sender's daily limits
      await this.checkDailyLimits(senderId, amount, tx);

      // 5. Calculate fees
      const fee = this.calculateTransferFee(amount);
      const totalDeduction = amount + fee;

      // 6. Check sender has sufficient balance
      const currentSender = await tx.passenger.findUnique({
        where: { id: sender.passenger!.id },
        select: { walletBalance: true }
      });

      const senderBalance = currentSender?.walletBalance.toNumber() || 0;
      if (senderBalance < totalDeduction) {
        throw new AppError(
          `Insufficient balance. Required: ₦${totalDeduction.toFixed(2)}, Available: ₦${senderBalance.toFixed(2)}`,
          400
        );
      }

      // 7. Atomic update balances
      const updatedSender = await tx.passenger.update({
        where: { id: sender.passenger!.id },
        data: { walletBalance: { decrement: totalDeduction } },
      });

      const updatedRecipient = await tx.passenger.update({
        where: { id: recipient.passenger!.id },
        data: { walletBalance: { increment: amount } },
      });

      const transferReference = this.generateTransferReference();

      // 8. Create transactions
      const debitTransaction = await tx.transaction.create({
        data: {
          userId: senderId,
          userType: UserRole.PASSENGER,
          type: TransactionType.DEBIT,
          category: TransactionCategory.TRANSFER,
          amount: new Decimal(-totalDeduction),
          balanceBefore: new Decimal(senderBalance),
          balanceAfter: updatedSender.walletBalance,
          status: TransactionStatus.SUCCESS,
          reference: transferReference,
          description: description || `Transfer to ${recipient.passenger!.firstName || ''} ${recipient.passenger!.lastName || ''}`.trim(),
          metadata: {
            recipientId,
            recipientName: `${recipient.passenger!.firstName || ''} ${recipient.passenger!.lastName || ''}`.trim(),
            fee,
            transferType: 'P2P',
          },
        },
      });

      // Credit transaction for recipient
      await tx.transaction.create({
        data: {
          userId: recipientId,
          userType: UserRole.PASSENGER,
          type: TransactionType.CREDIT,
          category: TransactionCategory.TRANSFER,
          amount: new Decimal(amount),
          balanceBefore: updatedRecipient.walletBalance.minus(amount),
          balanceAfter: updatedRecipient.walletBalance,
          status: TransactionStatus.SUCCESS,
          reference: `REC-${transferReference}`,
          description: `Transfer from ${sender.passenger!.firstName || ''} ${sender.passenger!.lastName || ''}`.trim(),
          metadata: {
            senderId,
            senderName: `${sender.passenger!.firstName || ''} ${sender.passenger!.lastName || ''}`.trim(),
            transferType: 'P2P',
          },
        },
      });

      // 9. Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          senderId,
          recipientId,
          amount: new Decimal(amount),
          description: description || '',
          reference: transferReference,
          status: TransferStatus.COMPLETED,
          debitTransactionId: debitTransaction.id,
          completedAt: new Date(),
        },
      });

      // 10. Handle fee transaction if applicable
      if (fee > 0) {
        await tx.transaction.create({
          data: {
            userId: senderId,
            userType: UserRole.PASSENGER,
            type: TransactionType.DEBIT,
            category: TransactionCategory.TRANSFER,
            amount: new Decimal(-fee),
            balanceBefore: updatedSender.walletBalance.plus(fee),
            balanceAfter: updatedSender.walletBalance,
            status: TransactionStatus.SUCCESS,
            reference: `FEE-${transferReference}`,
            description: 'Transfer fee',
            metadata: {
              relatedTransactionId: debitTransaction.id,
              feeType: 'TRANSFER_FEE',
            },
          },
        });
      }

      // 11. Notifications
      const senderName = `${sender.passenger!.firstName || ''} ${sender.passenger!.lastName || ''}`.trim();
      const recipientName = `${recipient.passenger!.firstName || ''} ${recipient.passenger!.lastName || ''}`.trim();
      
      await this.sendTransferNotifications(
        senderId,
        recipientId,
        amount,
        transferReference,
        senderName,
        recipientName,
        tx
      );

      // 12. Audit high-value transfers
      if (amount >= HIGH_VALUE_THRESHOLD) {
        // Fire and forget audit log outside the transaction to not slow it down
        setImmediate(() => {
          logAction(
            senderId,
            'HIGH_VALUE_TRANSFER_SENT',
            `Amount: ₦${amount}. Recipient: ${recipientId} (${recipientName}). Ref: ${transferReference}`
          );
          logAction(
            recipientId,
            'HIGH_VALUE_TRANSFER_RECEIVED',
            `Amount: ₦${amount}. Sender: ${senderId} (${senderName}). Ref: ${transferReference}`
          );
        });
      }

      return {
        success: true,
        message: 'Transfer completed successfully',
        data: {
          transferId: transfer.id,
          transactionId: debitTransaction.id,
          reference: transferReference,
          amount,
          fee,
          totalDeducted: totalDeduction,
          recipient: {
            id: recipient.id,
            name: recipientName,
            email: recipient.email,
          },
          sender: {
            id: sender.id,
            name: senderName,
            newBalance: updatedSender.walletBalance.toNumber(),
          },
          timestamp: debitTransaction.createdAt,
        },
      };
    }, {
      timeout: 15000 // Increase timeout to 15s for Supabase
    });
  }

  /**
   * Validate transfer amount against limits
   */
  private static validateTransferAmount(amount: number): void {
    if (amount < this.LIMITS.minAmount) {
      throw new AppError(
        `Minimum transfer amount is ₦${this.LIMITS.minAmount}`,
        400
      );
    }

    if (amount > this.LIMITS.maxAmountPerTransaction) {
      throw new AppError(
        `Maximum transfer amount per transaction is ₦${this.LIMITS.maxAmountPerTransaction}`,
        400
      );
    }
  }

  /**
   * Check if user has exceeded daily transfer limits
   */
  private static async checkDailyLimits(
    userId: string,
    amount: number,
    tx: any
  ): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's transfers
    const todayTransfers = await tx.transaction.findMany({
      where: {
        userId,
        category: TransactionCategory.TRANSFER,
        createdAt: {
          gte: today,
        },
        type: TransactionType.DEBIT,
        status: TransactionStatus.SUCCESS,
      },
    });

    // Check daily transaction count
    if (todayTransfers.length >= this.LIMITS.maxDailyTransactions) {
      throw new AppError(
        `Daily transaction limit reached (${this.LIMITS.maxDailyTransactions} transactions)`,
        400
      );
    }

    // Check daily amount limit
    const todayTotal = todayTransfers.reduce(
      (sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()),
      0
    );

    if (todayTotal + amount > this.LIMITS.maxDailyAmount) {
      const remaining = this.LIMITS.maxDailyAmount - todayTotal;
      throw new AppError(
        `Daily transfer limit exceeded. Remaining: ₦${remaining.toFixed(2)}`,
        400
      );
    }
  }

  /**
   * Calculate transfer fee
   */
  private static calculateTransferFee(amount: number): number {
    if (this.FEE_PERCENTAGE === 0) {
      return 0;
    }

    let fee = (amount * this.FEE_PERCENTAGE) / 100;

    // Apply fee cap if configured
    if (this.FEE_CAP > 0 && fee > this.FEE_CAP) {
      fee = this.FEE_CAP;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Generate unique transfer reference
   */
  private static generateTransferReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `TRF${timestamp}${random}`;
  }

  /**
   * Get transfer limits (for displaying to user)
   */
  static getTransferLimits(): TransferLimits {
    return this.LIMITS;
  }

  /**
   * Get user's remaining daily limit
   */
  static async getRemainingDailyLimit(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransfers = await prisma.transaction.findMany({
      where: {
        userId,
        category: TransactionCategory.TRANSFER,
        createdAt: {
          gte: today,
        },
        type: TransactionType.DEBIT,
        status: TransactionStatus.SUCCESS,
      },
    });

    const todayTotal = todayTransfers.reduce(
      (sum: number, tx: any) => sum + Math.abs(tx.amount.toNumber()),
      0
    );

    return {
      dailyLimit: this.LIMITS.maxDailyAmount,
      usedToday: todayTotal,
      remainingToday: this.LIMITS.maxDailyAmount - todayTotal,
      transactionsToday: todayTransfers.length,
      remainingTransactions: this.LIMITS.maxDailyTransactions - todayTransfers.length,
    };
  }

  /**
   * Get transfer history for a user
   */
  static async getTransferHistory(userId: string, limit: number = 50) {
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId },
        ],
      },
      include: {
        sender: {
          include: {
            passenger: true,
          },
        },
        recipient: {
          include: {
            passenger: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return transfers.map((transfer) => ({
      id: transfer.id,
      reference: transfer.reference,
      amount: transfer.amount.toNumber(),
      description: transfer.description,
      status: transfer.status,
      type: transfer.senderId === userId ? 'SENT' : 'RECEIVED',
      sender: {
        id: transfer.sender.id,
        name: `${transfer.sender.passenger?.firstName || ''} ${transfer.sender.passenger?.lastName || ''}`.trim(),
        email: transfer.sender.email,
      },
      recipient: {
        id: transfer.recipient.id,
        name: `${transfer.recipient.passenger?.firstName || ''} ${transfer.recipient.passenger?.lastName || ''}`.trim(),
        email: transfer.recipient.email,
      },
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,
    }));
  }

  /**
   * Get single transfer details
   */
  static async getTransferById(transferId: string, userId: string) {
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        sender: {
          include: {
            passenger: true,
          },
        },
        recipient: {
          include: {
            passenger: true,
          },
        },
      },
    });

    if (!transfer) {
      throw new AppError('Transfer not found', 404);
    }

    // Verify user is part of this transfer
    if (transfer.senderId !== userId && transfer.recipientId !== userId) {
      throw new AppError('Unauthorized to view this transfer', 403);
    }

    return {
      id: transfer.id,
      reference: transfer.reference,
      amount: transfer.amount.toNumber(),
      description: transfer.description,
      status: transfer.status,
      type: transfer.senderId === userId ? 'SENT' : 'RECEIVED',
      sender: {
        id: transfer.sender.id,
        name: `${transfer.sender.passenger?.firstName || ''} ${transfer.sender.passenger?.lastName || ''}`.trim(),
        email: transfer.sender.email,
      },
      recipient: {
        id: transfer.recipient.id,
        name: `${transfer.recipient.passenger?.firstName || ''} ${transfer.recipient.passenger?.lastName || ''}`.trim(),
        email: transfer.recipient.email,
      },
      debitTransactionId: transfer.debitTransactionId,
      creditTransactionId: transfer.creditTransactionId,
      createdAt: transfer.createdAt,
      completedAt: transfer.completedAt,
    };
  }

  /**
   * Send transfer notifications
   */
  private static async sendTransferNotifications(
    senderId: string,
    recipientId: string,
    amount: number,
    reference: string,
    senderName: string,
    recipientName: string,
    tx: any
  ): Promise<void> {
    try {
      // Create notification for sender
      await tx.notification.create({
        data: {
          userId: senderId,
          type: 'TRANSACTION',
          title: 'Transfer Successful',
          message: `You successfully sent ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${recipientName}`,
          metadata: {
            reference,
            amount,
            recipientId,
            recipientName,
            type: 'TRANSFER_SENT',
          },
        },
      });

      // Create notification for recipient
      await tx.notification.create({
        data: {
          userId: recipientId,
          type: 'WALLET_FUNDED',
          title: 'Money Received',
          message: `You received ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} from ${senderName}`,
          metadata: {
            reference,
            amount,
            senderId,
            senderName,
            type: 'TRANSFER_RECEIVED',
          },
        },
      });
      // Send real-time push notifications via Firebase
      const pushService = new PushNotificationService();
      await pushService.sendToUser(senderId, {
        title: 'Transfer Successful',
        body: `You sent ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} to ${recipientName}`,
        data: { type: 'TRANSFER_SENT', reference },
      });
      await pushService.sendToUser(recipientId, {
        title: 'Money Received! 💰',
        body: `You received ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} from ${senderName}`,
        data: { type: 'TRANSFER_RECEIVED', reference },
      });
    } catch (error) {
      // Log error but don't fail the transfer
      console.error('Failed to send notifications:', error);
    }
  }
}