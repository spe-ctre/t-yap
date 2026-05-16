/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service';
import { createError } from '../middleware/error.middleware';



export class TransactionController {
  private transactionService: TransactionService;

  constructor() {
    this.transactionService = new TransactionService();
  }

  /**
   * Get all transactions for the authenticated user
   * GET /api/transactions
   */
  getUserTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      // Get transactions from service
      const transactions = await this.transactionService.getUserTransactions(userId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a single transaction by reference
   * GET /api/transactions/:reference
   */
  getTransactionByReference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const userId = req.user!.id;

      if (!reference) {
        throw createError('Transaction reference is required', 400);
      }

      // Get transaction from service
      const transaction = await this.transactionService.getTransactionByReference(reference, userId);

      if (!transaction) {
        throw createError('Transaction not found', 404);
      }

      res.json({
        success: true,
        data: transaction
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new transaction (manual/internal usage)
   * POST /api/transactions
   */
  createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userType = req.user!.role;
      const { type, category, amount, description, metadata } = req.body;

      // Validate required fields
      if (!type || !category || !amount) {
        throw createError('Type, category, and amount are required', 400);
      }

      if (amount <= 0) {
        throw createError('Amount must be greater than 0', 400);
      }

      // Create transaction via service
      const transaction = await this.transactionService.createTransaction({
        userId,
        userType: userType as any,
        type,
        category,
        amount,
        description,
        metadata
      });

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Process a wallet top-up
   * POST /api/transactions/topup
   */
  processWalletTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const userType = req.user!.role;
      const { reference, provider = 'monnify' } = req.body;

      if (!reference) {
        throw createError('Payment reference is required', 400);
      }

      // Process top-up via service
      const transaction = await this.transactionService.processTopup(
        provider,
        reference,
        { userId, userType: userType as any }
      );

      res.json({
        success: true,
        data: transaction,
        message: 'Wallet top-up processed successfully'
      });
    } catch (error) {
      next(error);
    }
  };
}