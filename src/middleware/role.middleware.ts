// src/middleware/role.middleware.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { UserRole } from '@prisma/client';

/**
 * Middleware to check if user is an admin (PARK_MANAGER)
 */
export const isAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    // Check if user has PARK_MANAGER role (acting as admin)
    if (!userRole || (userRole as string) !== 'PARK_MANAGER' && (userRole as string) !== 'SUPER_ADMIN') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Admin privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied' 
    });
  }
};

/**
 * Middleware to check if user has specific role(s)
 * Usage: hasRole('DRIVER', 'AGENT')
 */
export const hasRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userRole = req.user?.role;

      if (!userRole || !allowedRoles.includes(userRole as UserRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(403).json({ 
        success: false,
        message: 'Access denied' 
      });
    }
  };
};

/**
 * Middleware to check if user is a driver
 */
export const isDriver = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    if (!userRole || userRole !== 'DRIVER') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Driver privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied' 
    });
  }
};

/**
 * Middleware to check if user is an agent
 */
export const isAgent = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    if (!userRole || userRole !== 'AGENT') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Agent privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied' 
    });
  }
};

/**
 * Middleware to check if user is a passenger
 */
export const requirePassenger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    if (!userRole || userRole !== 'PASSENGER') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Passenger privileges required.' 
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    return res.status(403).json({ 
      success: false,
      message: 'Access denied' 
    });
  }
};