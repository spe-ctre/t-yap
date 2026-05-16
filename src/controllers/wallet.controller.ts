/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';
import { createError } from '../middleware/error.middleware';



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
  getBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log('REQ.USER CONTENT:', req.user);
      const userId = req.user!.id;

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
  getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
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
  initializeTopUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
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
  verifyTopUp = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
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
  getTopUpStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
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
  /**
   * GET /api/wallet/transport/balance
   * Get transport wallet balance
   */
  getTransportBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { prisma } = require('../config/database');
      const passenger = await prisma.passenger.findUnique({
        where: { userId },
        select: { transportWalletBalance: true }
      });
      if (!passenger) throw createError('Passenger profile not found', 404);
      res.json({
        success: true,
        statusCode: 200,
        data: { transportWalletBalance: Number(passenger.transportWalletBalance) }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/wallet/transport/fund
   * Fund transport wallet from main wallet
   */
  fundTransportWallet = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { amount, pin } = req.body;
      if (!amount || !pin) throw createError('Amount and PIN are required', 400);
      if (amount <= 0) throw createError('Amount must be greater than 0', 400);
      const { prisma } = require('../config/database');
      const bcrypt = require('bcryptjs');
      const passenger = await prisma.passenger.findUnique({ where: { userId } });
      if (!passenger) throw createError('Passenger profile not found', 404);
      const isPinValid = await bcrypt.compare(pin, passenger.transactionPin || '');
      if (!isPinValid) throw createError('Invalid transaction PIN', 401);
      const mainBalance = Number(passenger.walletBalance);
      if (mainBalance < amount) throw createError('Insufficient wallet balance', 400);
      const newMainBalance = mainBalance - amount;
      const newTransportBalance = Number(passenger.transportWalletBalance) + amount;
      await prisma.passenger.update({
        where: { userId },
        data: {
          walletBalance: newMainBalance,
          transportWalletBalance: newTransportBalance
        }
      });
      res.json({
        success: true,
        statusCode: 200,
        message: 'Transport wallet funded successfully',
        data: {
          mainWalletBalance: newMainBalance,
          transportWalletBalance: newTransportBalance,
          amountFunded: amount
        }
      });
    } catch (error) {
      next(error);
    }
  };
}