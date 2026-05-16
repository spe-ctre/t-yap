/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { createError } from '../middleware/error.middleware';
import { prisma } from '../config/database';



export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Initialize wallet top-up
   * POST /api/payments/topup/initialize
   * Returns a payment reference and checkout details
   */
  initializeTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { amount } = req.body;
      const userId = req.user!.id;
      const userType = req.user!.role;

      if (!amount || amount <= 0) {
        throw createError('Amount must be greater than 0', 400);
      }

      // Get user for email (optional)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });

      // Initialize payment
      const result = await this.paymentService.initializePayment({
        userId,
        userType: userType as any,
        amount,
        email: user?.email,
        description: 'Wallet Top-up'
      });

      res.json({
        success: true,
        data: result,
        message: 'Payment initialized successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Verify and complete wallet top-up
   * POST /api/payments/topup/verify
   * Verifies payment with Monnify and credits wallet
   */
  verifyTopup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference, provider } = req.body;
      const userId = req.user!.id;
      const userType = req.user!.role;

      if (!reference) {
        throw createError('Payment reference is required', 400);
      }

      // Verify payment
      const result = await this.paymentService.verifyPayment({
        reference,
        userId,
        userType: userType as any
      });

      res.json({
        success: true,
        data: result,
        message: 'Payment verified and wallet credited successfully'
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Monnify webhook handler
   * POST /api/payments/webhook/monnify
   * Receives payment notifications from Monnify
   */
  monnifyWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = req.body;

      // Process webhook
      const result = await this.paymentService.handleWebhook(payload);

      res.status(200).json(result);
    } catch (error) {
      console.error('Webhook error:', error);
      // Always return 200 to Monnify to prevent retries
      res.status(200).json({ message: 'Webhook received' });
    }
  };

  /**
   * Get payment status
   * GET /api/payments/status/:reference
   */
  getPaymentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const userId = req.user!.id;

      const result = await this.paymentService.getPaymentStatus(reference, userId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}