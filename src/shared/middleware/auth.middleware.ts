// auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

// Define allowed user roles
import { UserRole } from '@prisma/client';
export { UserRole };

// Extend Express Request to include authenticated user (guaranteed by middleware)
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
  };
  deviceInfo?: {
    deviceName?: string;
    deviceType?: string;
    deviceId?: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

// Middleware to authenticate JWT token
export const authMiddleware = async (
  req: Request,
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
      select: { id: true, role: true, isEmailVerified: true, isPhoneVerified: true, deletedAt: true }
    });

    if (!userExists || userExists.deletedAt) {
      return res.status(401).json({
        success: false,
        message: userExists?.deletedAt ? 'Account deleted' : 'User not found'
      });
    }

    // Find the session record matching this token, to support session-specific operations
    const session = await prisma.userSession.findFirst({
      where: { token, userId: decoded.userId, isActive: true }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session not found or has been revoked'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      role: decoded.role as UserRole,
      isEmailVerified: userExists.isEmailVerified,
      isPhoneVerified: userExists.isPhoneVerified
    };

    // Attach sessionId so session-specific routes (e.g. revoke-others) can use it
    (req as any).sessionId = session.id;

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

// Export alias for compatibility with agent routes
export const authenticateToken = authMiddleware;