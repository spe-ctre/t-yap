import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import bcrypt from 'bcryptjs';

export class TransportWalletService {
  /**
   * Get transport wallet balance
   */
  static async getBalance(userId: string) {
    const passenger = await prisma.passenger.findUnique({
      where: { userId },
      select: { transportWalletBalance: true, walletBalance: true },
    });

    if (!passenger) {
      throw new AppError('Passenger profile not found', 404);
    }

    return {
      transportWalletBalance: Number(passenger.transportWalletBalance),
      mainWalletBalance: Number(passenger.walletBalance),
    };
  }

  /**
   * Transfer from main wallet to transport wallet
   */
  static async fundTransportWallet(userId: string, amount: number, pin: string) {
    if (amount <= 0) {
      throw new AppError('Invalid amount', 400);
    }

    const passenger = await prisma.passenger.findUnique({ 
      where: { userId },
      select: { 
        id: true, 
        transactionPin: true, 
        walletBalance: true, 
        transportWalletBalance: true 
      }
    });

    if (!passenger) {
      throw new AppError('Passenger profile not found', 404);
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, passenger.transactionPin || '');
    if (!isPinValid) {
      throw new AppError('Invalid transaction PIN', 401);
    }

    const mainBalance = Number(passenger.walletBalance);
    if (mainBalance < amount) {
      throw new AppError('Insufficient main wallet balance', 400);
    }

    const newMainBalance = mainBalance - amount;
    const newTransportBalance = Number(passenger.transportWalletBalance) + amount;

    // Update balances
    await prisma.passenger.update({
      where: { userId },
      data: {
        walletBalance: newMainBalance,
        transportWalletBalance: newTransportBalance,
      },
    });

    // TODO: Create a transaction log for this internal transfer

    return {
      amount,
      newMainBalance,
      newTransportBalance,
    };
  }

  /**
   * Get transport wallet transaction history
   */
  static async getHistory(userId: string, limit: number = 20) {
    // This currently fetches all P2P transfers, which might not be strictly transport-only.
    // In a mature system, we'd have a specific category for transport-wallet funding.
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        category: 'TRANSFER', // Simplified for now
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      transactions,
      count: transactions.length
    };
  }
}
