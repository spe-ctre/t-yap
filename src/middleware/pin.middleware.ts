import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createError } from './error.middleware';
import bcrypt from 'bcryptjs';

/**
 * Middleware to require transaction PIN verification
 * Expects PIN in request body: { pin: string }
 * Usage: router.post('/endpoint', authMiddleware, requirePinVerification, controller.method)
 */
export const requirePinVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    // Only passengers have transaction PINs
    if (req.user.role !== 'PASSENGER') {
      throw createError('Transaction PIN is only available for passengers', 403);
    }

    const { pin } = req.body;

    if (!pin) {
      throw createError('Transaction PIN is required', 400);
    }

    // Get passenger profile
    const passenger = await prisma.passenger.findUnique({
      where: { userId: req.user.id }
    });

    if (!passenger || !passenger.transactionPin) {
      throw createError('Transaction PIN not set. Please create a PIN first', 404);
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, passenger.transactionPin);
    if (!isPinValid) {
      throw createError('Invalid transaction PIN', 401);
    }

    // Remove PIN from request body for security (don't pass it to controller)
    delete req.body.pin;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if transaction PIN is set (doesn't verify, just checks existence)
 * Usage: router.get('/endpoint', authMiddleware, requirePinExists, controller.method)
 */
export const requirePinExists = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (req.user.role !== 'PASSENGER') {
      throw createError('Transaction PIN is only available for passengers', 403);
    }

    const passenger = await prisma.passenger.findUnique({
      where: { userId: req.user.id }
    });

    if (!passenger || !passenger.transactionPin) {
      throw createError('Transaction PIN not set. Please create a PIN first', 404);
    }

    next();
  } catch (error) {
    next(error);
  }
};

