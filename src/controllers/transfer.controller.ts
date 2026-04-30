// src/controllers/transfer.controller.ts
import { MonnifyService } from '../services/monnify.service';
import { prisma } from '../config/database';

const monnifyService = new MonnifyService();
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { TransferService } from '../services/transfer.service';
import { AppError } from '../utils/errors';

export class TransferController {
  /**
   * POST /api/transfers/p2p
   * Process peer-to-peer transfer
   */
  static async processTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const senderId = req.user?.id; // From auth middleware
      const { recipientId, amount, description, pin } = req.body;

      // Validation
      if (!recipientId || !amount || !pin) {
        throw new AppError('Recipient ID, amount, and PIN are required', 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('Amount must be a positive number', 400);
      }

      const result = await TransferService.processTransfer({
        senderId: senderId!,
        recipientId,
        amount,
        description,
        pin,
      });

      res.status(200).json({
        status: 'success',
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/limits
   * Get transfer limits configuration
   */
  static async getTransferLimits(req: Request, res: Response, next: NextFunction) {
    try {
      const limits = TransferService.getTransferLimits();

      res.status(200).json({
        status: 'success',
        data: {
          limits: {
            minimum: limits.minAmount,
            maximumPerTransaction: limits.maxAmountPerTransaction,
            maximumDaily: limits.maxDailyAmount,
            maximumDailyTransactions: limits.maxDailyTransactions,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/limits/remaining
   * Get user's remaining daily transfer limit
   */
  static async getRemainingLimit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const remaining = await TransferService.getRemainingDailyLimit(userId!);

      res.status(200).json({
        status: 'success',
        data: remaining,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/transfers/validate
   * Validate transfer before processing (pre-check)
   */
  static async validateTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const senderId = req.user?.id;
      const { recipientId, amount } = req.body;

      if (!recipientId || !amount) {
        throw new AppError('Recipient ID and amount are required', 400);
      }

      // Check recipient exists
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        include: { passenger: true },
      });

      if (!recipient) {
        throw new AppError('Recipient not found', 404);
      }

      if (!recipient.passenger) {
        throw new AppError('Recipient does not have an active profile', 400);
      }

      if (senderId === recipientId) {
        throw new AppError('Cannot transfer to yourself', 400);
      }

      // Check sender's balance
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        include: { passenger: true },
      });

      if (!sender?.passenger) {
        throw new AppError('Passenger profile not found', 404);
      }

      // Get limits
      const limits = TransferService.getTransferLimits();

      if (amount < limits.minAmount) {
        throw new AppError(`Minimum transfer amount is ₦${limits.minAmount}`, 400);
      }

      if (amount > limits.maxAmountPerTransaction) {
        throw new AppError(
          `Maximum transfer amount is ₦${limits.maxAmountPerTransaction}`,
          400
        );
      }

      const senderBalance = sender.passenger.walletBalance.toNumber();
      if (senderBalance < amount) {
        throw new AppError(
          `Insufficient balance. Available: ₦${senderBalance}`,
          400
        );
      }

      // Check daily limits
      const remaining = await TransferService.getRemainingDailyLimit(senderId!);

      if (remaining.remainingToday < amount) {
        throw new AppError(
          `Daily limit exceeded. Remaining: ₦${remaining.remainingToday}`,
          400
        );
      }

      if (remaining.remainingTransactions <= 0) {
        throw new AppError('Daily transaction limit reached', 400);
      }

      res.status(200).json({
        status: 'success',
        message: 'Transfer validation successful',
        data: {
          valid: true,
          recipient: {
            id: recipient.id,
            name: `${recipient.passenger.firstName || ''} ${recipient.passenger.lastName || ''}`.trim(),
            email: recipient.email,
          },
          amount,
          fee: 0,
          total: amount,
          remainingDailyLimit: remaining.remainingToday,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/history
   * Get user's transfer history
   */
  static async getTransferHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const history = await TransferService.getTransferHistory(userId!, limit);

      res.status(200).json({
        status: 'success',
        data: {
          transfers: history,
          count: history.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/:transferId
   * Get single transfer details
   */
  static async getTransferById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { transferId } = req.params;

      if (!transferId) {
        throw new AppError('Transfer ID is required', 400);
      }

      const transfer = await TransferService.getTransferById(transferId, userId!);

      res.status(200).json({
        status: 'success',
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/:transferId/receipt
   * Download transfer receipt as PDF
   */
  static async downloadReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { transferId } = req.params;

      if (!transferId) {
        throw new AppError('Transfer ID is required', 400);
      }

      // Get transfer details
      const transfer = await TransferService.getTransferById(transferId, userId!);

      // Import ReceiptService
      const { ReceiptService } = require('../services/receipt.service');

      // Generate PDF
      const pdfBuffer = await ReceiptService.generateTransferReceipt({
        transferId: transfer.id,
        reference: transfer.reference,
        amount: transfer.amount,
        fee: 0, // You can calculate this if you have fee logic
        totalDeducted: transfer.amount,
        sender: transfer.sender,
        recipient: transfer.recipient,
        description: transfer.description || '',
        timestamp: transfer.createdAt,
        status: transfer.status,
      });

      // Generate filename
      const filename = ReceiptService.generateReceiptFilename(transfer.reference);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      // Send PDF
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/transfers/banks
   * Get list of Nigerian banks
   */
  static async getBanks(req: Request, res: Response, next: NextFunction) {
    try {
      const banks = await monnifyService.getBankList();
      res.status(200).json({
        success: true,
        statusCode: 200,
        data: banks,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/transfers/resolve-account
   * Resolve account name from account number + bank code
   */
  static async resolveAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountNumber, bankCode } = req.body;
      if (!accountNumber || !bankCode) {
        throw new AppError('Account number and bank code are required', 400);
      }
      const result = await monnifyService.verifyBankAccount(accountNumber, bankCode);
      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/transfers/bank
   * Send money to external Nigerian bank account
   */
  static async bankTransfer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const senderId = req.user?.id;
      const { accountNumber, bankCode, bankName, accountName, amount, narration, pin } = req.body;

      if (!accountNumber || !bankCode || !accountName || !amount || !pin) {
        throw new AppError('Account number, bank code, account name, amount and PIN are required', 400);
      }

      if (typeof amount !== 'number' || amount <= 0) {
        throw new AppError('Amount must be a positive number', 400);
      }

      // Get user and verify PIN
      const user = await prisma.user.findUnique({
        where: { id: senderId },
        include: { passenger: true },
      });

      if (!user || !user.passenger) {
        throw new AppError('Passenger profile not found', 404);
      }

      // Verify PIN
      const bcrypt = require('bcryptjs');
      const isPinValid = await bcrypt.compare(pin, user.passenger.transactionPin || '');
      if (!isPinValid) {
        throw new AppError('Invalid transaction PIN', 401);
      }

      // Check balance
      const balance = Number(user.passenger.walletBalance);
      if (balance < amount) {
        throw new AppError('Insufficient wallet balance', 400);
      }

      // Generate unique reference
      const reference = `BANK-TRF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

      // Initiate disbursement via Monnify
      const disbursement = await monnifyService.initiateTransfer({
        amount,
        reference,
        narration: narration || `Transfer to ${accountName}`,
        destinationAccountNumber: accountNumber,
        destinationBankCode: bankCode,
        destinationAccountName: accountName,
        destinationEmail: user.email,
      });

      // Debit wallet and create transaction record
      const newBalance = balance - amount;
      await prisma.$transaction([
        prisma.passenger.update({
          where: { userId: senderId },
          data: { walletBalance: newBalance },
        }),
        prisma.transaction.create({
          data: {
            userId: senderId!,
            userType: 'PASSENGER',
            type: 'DEBIT',
            category: 'TRANSFER',
            amount,
            balanceBefore: balance,
            balanceAfter: newBalance,
            status: 'SUCCESS',
            reference,
            description: narration || `Transfer to ${accountName}`,
            metadata: {
              accountNumber,
              bankCode,
              bankName,
              accountName,
              monnifyReference: disbursement?.reference,
              disbursement,
            },
          },
        }),
      ]);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: 'Bank transfer successful',
        data: {
          reference,
          amount,
          accountNumber,
          bankName,
          accountName,
          newBalance,
          disbursement,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}