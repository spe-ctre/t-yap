// src/services/bank-account.service.ts

import { PrismaClient, BankAccountType } from '@prisma/client';
import { AppError } from '../utils/errors';
import { getBanks, verifyBankAccount as verifyBankAccountMonnify } from '../utils/monnify.utils';

const prisma = new PrismaClient();

interface AddBankAccountRequest {
  userId: string;
  accountNumber: string;
  bankCode: string;
  accountType?: BankAccountType;
}

interface BankInfo {
  name: string;
  code: string;
}

export class BankAccountService {
  /**
   * Get list of Nigerian banks from Monnify
   */
  static async getBankList(): Promise<BankInfo[]> {
    try {
      const banks = await getBanks();
      return banks;
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch bank list from payment provider', 500);
    }
  }

  /**
   * Resolve/verify bank account details using Monnify
   */
  static async verifyBankAccount(accountNumber: string, bankCode: string) {
    try {
      const verifiedAccount = await verifyBankAccountMonnify(accountNumber, bankCode);
      
      return {
        accountNumber: verifiedAccount.accountNumber,
        accountName: verifiedAccount.accountName,
        bankCode: verifiedAccount.bankCode,
      };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      
      throw new AppError('Failed to verify bank account. Please check the details and try again.', 400);
    }
  }

  /**
   * Add a new bank account
   */
  static async addBankAccount(data: AddBankAccountRequest) {
    const { userId, accountNumber, bankCode, accountType = BankAccountType.SAVINGS } = data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if account already exists for this user
    const existingAccount = await prisma.bankAccount.findFirst({
      where: {
        userId,
        accountNumber,
        bankCode,
      },
    });

    if (existingAccount) {
      throw new AppError('This bank account is already added', 400);
    }

    // Verify bank account with Monnify
    const verifiedAccount = await this.verifyBankAccount(accountNumber, bankCode);

    // Get bank name from bank list
    const banks = await this.getBankList();
    const bank = banks.find((b) => b.code === bankCode);
    const bankName = bank?.name || 'Unknown Bank';

    // Check if this is user's first bank account
    const userBankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
    });

    const isFirstAccount = userBankAccounts.length === 0;

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId,
        accountNumber: verifiedAccount.accountNumber,
        accountName: verifiedAccount.accountName,
        bankName,
        bankCode,
        accountType,
        isDefault: isFirstAccount, // First account is default
        isVerified: true,
      },
    });

    return {
      id: bankAccount.id,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      accountType: bankAccount.accountType,
      isDefault: bankAccount.isDefault,
      isVerified: bankAccount.isVerified,
      createdAt: bankAccount.createdAt,
    };
  }

  /**
   * Get all bank accounts for a user
   */
  static async getUserBankAccounts(userId: string) {
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return bankAccounts.map((account) => ({
      id: account.id,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode,
      accountType: account.accountType,
      isDefault: account.isDefault,
      isVerified: account.isVerified,
      createdAt: account.createdAt,
    }));
  }

  /**
   * Get a single bank account
   */
  static async getBankAccountById(accountId: string, userId: string) {
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    if (bankAccount.userId !== userId) {
      throw new AppError('Unauthorized to access this bank account', 403);
    }

    return {
      id: bankAccount.id,
      accountNumber: bankAccount.accountNumber,
      accountName: bankAccount.accountName,
      bankName: bankAccount.bankName,
      bankCode: bankAccount.bankCode,
      accountType: bankAccount.accountType,
      isDefault: bankAccount.isDefault,
      isVerified: bankAccount.isVerified,
      createdAt: bankAccount.createdAt,
    };
  }

  /**
   * Set a bank account as default
   */
  static async setDefaultBankAccount(accountId: string, userId: string) {
    // Verify account belongs to user
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    if (bankAccount.userId !== userId) {
      throw new AppError('Unauthorized to modify this bank account', 403);
    }

    // Use transaction to ensure atomicity
    await prisma.$transaction([
      // Remove default from all user's accounts
      prisma.bankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      // Set new default
      prisma.bankAccount.update({
        where: { id: accountId },
        data: { isDefault: true },
      }),
    ]);

    return {
      success: true,
      message: 'Default bank account updated successfully',
    };
  }

  /**
   * Delete a bank account
   */
  static async deleteBankAccount(accountId: string, userId: string) {
    // Verify account belongs to user
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: accountId },
    });

    if (!bankAccount) {
      throw new AppError('Bank account not found', 404);
    }

    if (bankAccount.userId !== userId) {
      throw new AppError('Unauthorized to delete this bank account', 403);
    }

    // Check if this is the default account
    const wasDefault = bankAccount.isDefault;

    // Delete the account
    await prisma.bankAccount.delete({
      where: { id: accountId },
    });

    // If it was default, set another account as default
    if (wasDefault) {
      const remainingAccounts = await prisma.bankAccount.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remainingAccounts) {
        await prisma.bankAccount.update({
          where: { id: remainingAccounts.id },
          data: { isDefault: true },
        });
      }
    }

    return {
      success: true,
      message: 'Bank account deleted successfully',
    };
  }

  /**
   * Get default bank account for a user
   */
  static async getDefaultBankAccount(userId: string) {
    const defaultAccount = await prisma.bankAccount.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!defaultAccount) {
      throw new AppError('No default bank account found', 404);
    }

    return {
      id: defaultAccount.id,
      accountNumber: defaultAccount.accountNumber,
      accountName: defaultAccount.accountName,
      bankName: defaultAccount.bankName,
      bankCode: defaultAccount.bankCode,
      accountType: defaultAccount.accountType,
      isDefault: defaultAccount.isDefault,
      isVerified: defaultAccount.isVerified,
    };
  }
}