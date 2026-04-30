import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { createError } from './error.middleware';

/**
 * Middleware to require email verification
 * Usage: router.post('/endpoint', authMiddleware, requireEmailVerification, controller.method)
 */
export const requireEmailVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (!req.user.isEmailVerified) {
      throw createError('Email verification required. Please verify your email address', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require phone verification
 * Usage: router.post('/endpoint', authMiddleware, requirePhoneVerification, controller.method)
 */
export const requirePhoneVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (!req.user.isPhoneVerified) {
      throw createError('Phone verification required. Please verify your phone number', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to require both email and phone verification
 */
export const requireFullVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('User not authenticated', 401);
    }

    if (!req.user.isEmailVerified) {
      throw createError('Email verification required. Please verify your email address', 403);
    }

    if (!req.user.isPhoneVerified) {
      throw createError('Phone verification required. Please verify your phone number', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

