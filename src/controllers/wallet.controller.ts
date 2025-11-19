import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services/wallet.service';

/**
 * WalletController - Handles HTTP requests related to wallets
 * 
 * Think of this as the "waiter" - it takes orders (HTTP requests),
 * talks to the kitchen (WalletService), and brings back the food (HTTP responses).
 */
export class WalletController {
  private walletService: WalletService;

  constructor() {
    // Create an instance of WalletService when controller is created
    this.walletService = new WalletService();
  }

  /**
   * Handle GET /api/wallet/balance request
   * 
   * How it works:
   * 1. Receives the HTTP request
   * 2. Gets userId from req.user (set by authMiddleware)
   * 3. Calls walletService.getBalance()
   * 4. Sends the response back to the user
   */
  getBalance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // req.user is set by authMiddleware after verifying the JWT token
      // It contains the logged-in user's information
      const userId = req.user.id;

      // Call the service to get the balance
      const result = await this.walletService.getBalance(userId);

      // Send success response
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      // If anything goes wrong, pass it to error handler
      next(error);
    }
  };

  /**
   * Handle GET /api/wallet/transactions request
   * 
   * This gets the transaction history for the logged-in user
   */
  getTransactionHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      // Get query parameters for pagination
      // Example: /api/wallet/transactions?limit=20&offset=0
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.walletService.getTransactionHistory(userId, limit, offset);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}

