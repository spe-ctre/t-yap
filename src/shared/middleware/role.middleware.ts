// src/middleware/role.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

/**
 * Middleware to check if user is an admin (PARK_MANAGER)
 */
export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userRole = req.user?.role;

    // Check if user has an admin role
    const adminRoles: string[] = ['JUNIOR_ADMIN', 'MANAGER_ADMIN', 'SUPER_ADMIN'];
    if (!userRole || !adminRoles.includes(userRole as string)) {
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
  return (req: Request, res: Response, next: NextFunction) => {
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
  req: Request,
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
  req: Request,
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
  req: Request,
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

/**
 * Middleware to check clearance level for Admins
 * Higher level means more power
 * 5: SUPER_ADMIN
 * 4: FINANCE_ADMIN, SYSTEM_ENGINEER
 * 3: COMPLIANCE_OFFICER, OPERATIONS_ADMIN
 * 2: SUPPORT_ADMIN
 * 1: PARK_MANAGER, AGENT
 */
export const requireClearance = (minLevel: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const roleLevels: Record<string, number> = {
        'SUPER_ADMIN': 5,
        'FINANCE_ADMIN': 4,
        'SYSTEM_ENGINEER': 4,
        'COMPLIANCE_OFFICER': 3,
        'OPERATIONS_ADMIN': 3,
        'SUPPORT_ADMIN': 2,
        'PARK_MANAGER': 1,
        'AGENT': 1,
        'DRIVER': 0,
        'PASSENGER': 0
      };

      const userLevel = roleLevels[user.role as string] || 0;

      if (userLevel < minLevel) {
        return res.status(403).json({ 
          error: 'Insufficient clearance level',
          required: minLevel,
          current: userLevel
        });
      }

      next();
    } catch (error) {
      console.error('Clearance check error:', error);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
  };
};