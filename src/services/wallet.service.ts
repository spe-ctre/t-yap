import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

/**
 * WalletService - Handles all wallet-related operations
 * 
 * Think of this as the "brain" that knows how to work with money in wallets.
 * It doesn't know about HTTP requests - it just knows business logic.
 */
export class WalletService {
  /**
   * Get the current wallet balance for a user
   * 
   * How it works:
   * 1. Takes the userId (from the logged-in user)
   * 2. Finds their Passenger record (which has the walletBalance)
   * 3. Returns the balance
   * 
   * @param userId - The ID of the logged-in user
   * @returns The wallet balance and user info
   */
  async getBalance(userId: string) {
    // Find the user's passenger record
    // Remember: Every user has a passenger record created during signup
    const passenger = await prisma.passenger.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            isEmailVerified: true
          }
        }
      }
    });

    // If passenger doesn't exist, something went wrong
    if (!passenger) {
      throw createError('Passenger record not found', 404);
    }

    // Return the balance and user info
    return {
      balance: Number(passenger.walletBalance), // Convert Decimal to number for JSON
      currency: 'NGN', // Nigerian Naira
      user: passenger.user
    };
  }

  /**
   * Get transaction history for a user
   * 
   * This will be used later when we create the Transaction model.
   * For now, it's a placeholder to show you the pattern.
   * 
   * @param userId - The ID of the logged-in user
   * @param limit - How many transactions to return (default: 10)
   * @param offset - For pagination (default: 0)
   */
  async getTransactionHistory(userId: string, limit: number = 10, offset: number = 0) {
    // TODO: Implement when Transaction model is created
    // This is just a placeholder to show you the structure
    
    const passenger = await prisma.passenger.findUnique({
      where: { userId }
    });

    if (!passenger) {
      throw createError('Passenger record not found', 404);
    }

    // For now, return empty array
    // Later, we'll query the Transaction table here
    return {
      transactions: [],
      total: 0,
      limit,
      offset
    };
  }
}

