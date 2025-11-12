import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { createError } from './error.middleware';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      user: any;
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw createError('Access denied. No token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    
    if (!user) {
      throw createError('Invalid token', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};