/// <reference path="../../shared/types/express" />
import { Request, Response } from 'express';
import { prisma } from '../../shared/config/database';

export class PMTransactionController {
  static async getAllTransactions(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { driverId, routeId, status, startDate, endDate, page = '1', limit = '20', search } = req.query;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        // Transactions related to this park via trip/vehicle
        trip: {
          vehicle: { currentParkId: parkManager.parkId }
        }
      };

      if (driverId) where.trip = { ...where.trip, driverId };
      if (routeId) where.trip = { ...where.trip, routeId };
      if (status) where.status = status;
      
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      if (search) {
        where.OR = [
          { trip: { driver: { firstName: { contains: search as string, mode: 'insensitive' } } } },
          { trip: { driver: { lastName: { contains: search as string, mode: 'insensitive' } } } },
          { reference: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            trip: {
              include: {
                driver: { select: { firstName: true, lastName: true } },
                route: { select: { name: true } },
              }
            }
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transaction.count({ where }),
      ]);

      const formattedTransactions = transactions.map(t => ({
        id: t.id,
        time: t.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: t.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
        driver: t.trip?.driver ? `${t.trip.driver.firstName} ${t.trip.driver.lastName}` : 'System',
        route: t.trip?.route?.name || 'N/A',
        amount: Number(t.amount),
        paymentStatus: t.status,
        reference: t.reference
      }));

      return res.json({
        success: true,
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get all transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
}
