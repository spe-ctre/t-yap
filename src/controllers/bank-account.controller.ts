// src/controllers/bank-account.controller.ts

import { Request, Response, NextFunction } from 'express';
import { BankAccountService } from '../services/bank-account.service';
import { AppError } from '../utils/errors';
import { BankAccountType } from '@prisma/client';

export class BankAccountController {
  /**
   * GET /api/bank-accounts/banks
   * Get list of supported banks
   */
  static async getBankList(req: Request, res: Response, next: NextFunction) {
    try {
      const banks = await BankAccountService.getBankList();

      res.status(200).json({
        status: 'success',
        data: {
          banks,
          count: banks.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bank-accounts/verify
   * Verify bank account details
   */
  static async verifyBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountNumber, bankCode } = req.body;

      if (!accountNumber || !bankCode) {
        throw new AppError('Account number and bank code are required', 400);
      }

      // Validate account number format
      if (!/^\d{10}$/.test(accountNumber)) {
        throw new AppError('Account number must be 10 digits', 400);
      }

      const verifiedAccount = await BankAccountService.verifyBankAccount(
        accountNumber,
        bankCode
      );

      res.status(200).json({
        status: 'success',
        message: 'Bank account verified successfully',
        data: verifiedAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/bank-accounts
   * Add a new bank account
   */
  static async addBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { accountNumber, bankCode, accountType } = req.body;

      if (!accountNumber || !bankCode) {
        throw new AppError('Account number and bank code are required', 400);
      }

      // Validate account number format
      if (!/^\d{10}$/.test(accountNumber)) {
        throw new AppError('Account number must be 10 digits', 400);
      }

      // Validate account type if provided
      if (accountType && !Object.values(BankAccountType).includes(accountType)) {
        throw new AppError('Invalid account type', 400);
      }

      const bankAccount = await BankAccountService.addBankAccount({
        userId: userId!,
        accountNumber,
        bankCode,
        accountType: accountType || BankAccountType.SAVINGS,
      });

      res.status(201).json({
        status: 'success',
        message: 'Bank account added successfully',
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bank-accounts
   * Get all bank accounts for authenticated user
   */
  static async getUserBankAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const bankAccounts = await BankAccountService.getUserBankAccounts(userId!);

      res.status(200).json({
        status: 'success',
        data: {
          accounts: bankAccounts,
          count: bankAccounts.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bank-accounts/:accountId
   * Get a single bank account
   */
  static async getBankAccountById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      if (!accountId) {
        throw new AppError('Account ID is required', 400);
      }

      const bankAccount = await BankAccountService.getBankAccountById(
        accountId,
        userId!
      );

      res.status(200).json({
        status: 'success',
        data: bankAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/bank-accounts/default
   * Get default bank account
   */
  static async getDefaultBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const defaultAccount = await BankAccountService.getDefaultBankAccount(userId!);

      res.status(200).json({
        status: 'success',
        data: defaultAccount,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/bank-accounts/:accountId/set-default
   * Set a bank account as default
   */
  static async setDefaultBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      if (!accountId) {
        throw new AppError('Account ID is required', 400);
      }

      const result = await BankAccountService.setDefaultBankAccount(
        accountId,
        userId!
      );

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/bank-accounts/:accountId
   * Delete a bank account
   */
  static async deleteBankAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      if (!accountId) {
        throw new AppError('Account ID is required', 400);
      }

      const result = await BankAccountService.deleteBankAccount(accountId, userId!);

      res.status(200).json({
        status: 'success',
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}