import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { createError } from './error.middleware';
import { SessionService } from '../services/session.service';

declare global {
  namespace Express {
    interface Request {
      user: any;
      sessionId?: string;
    }
  }
}

const sessionService = new SessionService();

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw createError('Access denied. No token provided', 401);
    }

    // Validate session token
    const sessionValidation = await sessionService.validateSession(token);
    
    if (!sessionValidation) {
      throw createError('Invalid or expired session', 401);
    }

    // Get user
    const user = await prisma.user.findUnique({ where: { id: sessionValidation.userId } });
    
    if (!user) {
      throw createError('User not found', 401);
    }

    req.user = user;
    req.sessionId = sessionValidation.sessionId;
    next();
  } catch (error) {
    next(error);
  }
};