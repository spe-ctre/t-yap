import { Request, Response, NextFunction } from 'express';
import { createError } from './error.middleware';
import { UserRole } from '@prisma/client';

/**
 * Middleware to require specific user roles
 * Usage: router.get('/endpoint', authMiddleware, requireRole(['PASSENGER', 'DRIVER']), controller.method)
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw createError('User not authenticated', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw createError(`Access denied. Required roles: ${allowedRoles.join(', ')}`, 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to require PASSENGER role
 */
export const requirePassenger = requireRole(['PASSENGER']);

/**
 * Middleware to require DRIVER role
 */
export const requireDriver = requireRole(['DRIVER']);

/**
 * Middleware to require AGENT role
 */
export const requireAgent = requireRole(['AGENT']);

/**
 * Middleware to require PARK_MANAGER role
 */
export const requireParkManager = requireRole(['PARK_MANAGER']);

/**
 * Middleware to require DRIVER or AGENT role
 */
export const requireDriverOrAgent = requireRole(['DRIVER', 'AGENT']);

/**
 * Middleware to require AGENT or PARK_MANAGER role
 */
export const requireAgentOrParkManager = requireRole(['AGENT', 'PARK_MANAGER']);

