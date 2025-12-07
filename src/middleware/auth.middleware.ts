// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { createError } from './error.middleware';

// Define allowed user roles (must match Prisma UserRole enum)
export type UserRole = 'PASSENGER' | 'DRIVER' | 'AGENT' | 'PARK_MANAGER';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

// Middleware to authenticate JWT token
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: 'Authorization header missing or malformed' 
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Token missing' 
      });
    }

    // Get JWT secret (throw error if not set)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not configured!');
      return res.status(500).json({ 
        success: false,
        message: 'Server configuration error' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret) as { userId: string; role: UserRole };

    // Check user existence in DB
    const userExists = await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      select: { id: true, role: true }
    });

    if (!userExists) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role
    };

    next();
  } catch (error: any) {
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.' 
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    }

    console.error('Auth middleware error:', error.message);
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed' 
    });
  }
};