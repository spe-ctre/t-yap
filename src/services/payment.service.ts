// src/services/payment.service.ts
import { prisma } from '../config/database';
import { TransactionService } from './transaction.service';
import { UserType, TransactionType, TransactionCategory } from '@prisma/client';
import { verifyWalletTopup } from '../utils/monnify.utils';
import { createError } from '../middleware/error.middleware';
import { v4 as uuidv4 } from 'uuid';

interface InitializePaymentInput {
  userId: string;
  userType: UserType;
  amount: number;
  email?: string;
  description?: string;
}

interface InitializePaymentResponse {
  reference: string;
  amount: number;
  checkoutUrl?: string;
  provider: string;
}

interface VerifyPaymentInput {
  reference: string;
  userId: string;
  userType: UserType;
}

export class PaymentService {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Initialize a payment for wallet top-up
   * Creates a pending transaction and returns payment reference
   */
  async initializePayment(data: InitializePaymentInput): Promise<InitializePaymentResponse> {
    const { userId, userType, amount, email, description } = data;

    // Validate amount
    if (amount <= 0) {
      throw createError('Amount must be greater than 0', 400);
    }

    // Set minimum and maximum top-up limits
    const MIN_TOPUP = 100; // ₦100
    const MAX_TOPUP = 1000000; // ₦1,000,000
    
    if (amount < MIN_TOPUP) {
      throw createError(`Minimum top-up amount is ₦${MIN_TOPUP}`, 400);
    }
    
    if (amount > MAX_TOPUP) {
      throw createError(`Maximum top-up amount is ₦${MAX_TOPUP}`, 400);
    }

    // Generate unique payment reference
    const reference = `TOPUP-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create pending transaction
    await this.transactionService.createTransaction({
      userId,
      userType,
      type: TransactionType.CREDIT,
      category: TransactionCategory.WALLET_TOPUP,
      amount,
      description: description || 'Wallet Top-up',
      reference,
      metadata: {
        provider: 'monnify',
        email,
        status: 'pending',
        initiatedAt: new Date().toISOString()
      }
    });

    // In production, you would call Monnify API here to get checkout URL
    // For now, return the reference for frontend to handle
    return {
      reference,
      amount,
      provider: 'monnify',
      // checkoutUrl: 'https://sandbox.monnify.com/checkout/...' // Add when Monnify is fully integrated
    };
  }

  /**
   * Verify payment and credit wallet
   * Calls Monnify API to verify payment, then credits user wallet
   */
  async verifyPayment(data: VerifyPaymentInput) {
    const { reference, userId, userType } = data;

    // Get the pending transaction
    const transaction = await prisma.transaction.findFirst({
      where: { reference, userId }
    });

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    // Check if already processed
    if (transaction.status === 'SUCCESS') {
      throw createError('Transaction already processed', 400);
    }

    if (transaction.status === 'FAILED') {
      throw createError('Transaction failed', 400);
    }

    try {
      // Verify payment with Monnify
      const monnifyResponse = await verifyWalletTopup(reference);

      // Check if payment was successful
      if (monnifyResponse.paymentStatus !== 'PAID') {
        // Update transaction status to failed
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'FAILED',
            metadata: {
              ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
              monnifyResponse,
              failedAt: new Date().toISOString()
            }
          }
        });

        throw createError('Payment verification failed', 400);
      }

      // Verify amount matches
      if (monnifyResponse.amount !== transaction.amount.toNumber()) {
        throw createError('Amount mismatch', 400);
      }

      // Process the top-up (credit wallet and update transaction)
      const result = await this.transactionService.processTopup(
        'monnify',
        reference,
        { userId, userType }
      );

      // Update transaction with Monnify response data
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          metadata: {
            ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
            monnifyResponse,
            verifiedAt: new Date().toISOString(),
            customerName: monnifyResponse.customerName,
            customerEmail: monnifyResponse.customerEmail,
            paymentMethod: monnifyResponse.paymentMethod
          }
        }
      });

      return result;
    } catch (error: any) {
      // Mark transaction as failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
            error: error.message,
            failedAt: new Date().toISOString()
          }
        }
      });

      throw error;
    }
  }

  /**
   * Handle Monnify webhook
   * Processes payment notifications from Monnify
   */
  async handleWebhook(payload: any) {
    const { paymentReference, paymentStatus, amountPaid, paidOn } = payload;

    if (!paymentReference) {
      throw createError('Invalid webhook payload', 400);
    }

    // Find transaction
    const transaction = await prisma.transaction.findFirst({
      where: { reference: paymentReference }
    });

    if (!transaction) {
      console.log(`Webhook received for unknown transaction: ${paymentReference}`);
      return { message: 'Transaction not found' };
    }

    // Only process if payment is successful
    if (paymentStatus === 'PAID') {
      // Check if already processed
      if (transaction.status === 'SUCCESS') {
        return { message: 'Transaction already processed' };
      }

      // Get user type from transaction
      const userType = transaction.userType;

      // Process the top-up
      await this.transactionService.processTopup(
        'monnify',
        paymentReference,
        { userId: transaction.userId, userType }
      );

      // Update transaction
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'SUCCESS',
          metadata: {
            ...(typeof transaction.metadata === 'object' ? transaction.metadata : {}),
            webhookPayload: payload,
            paidOn,
            amountPaid
          }
        }
      });

      return { message: 'Payment processed successfully' };
    }

    return { message: 'Webhook received' };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(reference: string, userId: string) {
    const transaction = await prisma.transaction.findFirst({
      where: { reference, userId }
    });

    if (!transaction) {
      throw createError('Transaction not found', 404);
    }

    return {
      reference: transaction.reference,
      amount: transaction.amount,
      status: transaction.status,
      category: transaction.category,
      createdAt: transaction.createdAt,
      metadata: transaction.metadata
    };
  }
}