// src/controllers/wallet.controller.ts

import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { createError } from '../middleware/error.middleware';

/**
 * AuthenticatedRequest interface
 * Extends Express Request to include user information from JWT token
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'PASSENGER' | 'DRIVER' | 'AGENT';
  };
}

/**
 * WalletController - Handles HTTP requests related to wallets
 */
export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  /**
   * GET /api/wallet/balance
   * Get wallet balance
   */
  getBalance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log('REQ.USER CONTENT:', req.user);
      const userId = req.user.id;

      const result = await this.walletService.getBalance(userId);

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/wallet/transactions
   * Get transaction history
   */
  getTransactionHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.walletService.getTransactionHistory(userId, limit, offset);

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/wallet/topup/initialize
   * Initialize wallet top-up
   */
  initializeTopUp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { amount } = req.body;

      // Validate amount
      if (!amount || typeof amount !== 'number') {
        throw createError('Valid amount is required', 400);
      }

      const result = await this.walletService.initializeTopUp(userId, amount);

      res.status(200).json({
        success: true,
        message: 'Top-up initialized successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/wallet/topup/verify
   * Verify and complete top-up transaction
   */
  verifyTopUp = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { transactionReference } = req.body;

      if (!transactionReference) {
        throw createError('Transaction reference is required', 400);
      }

      const result = await this.walletService.verifyTopUp(userId, transactionReference);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/wallet/topup/status/:reference
   * Get top-up transaction status
   */
  getTopUpStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      const { reference } = req.params;

      if (!reference) {
        throw createError('Transaction reference is required', 400);
      }

      const result = await this.walletService.getTopUpStatus(userId, reference);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}