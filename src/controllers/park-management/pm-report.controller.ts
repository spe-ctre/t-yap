import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMReportController {
  static async getRevenueReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const where: any = {
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
        vehicle: { currentParkId: parkManager.parkId },
      };

      if (startDate && endDate) {
        where.createdAt = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
      }

      const transactions = await prisma.transaction.findMany({
        where,
        select: { amount: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

      return res.json({ totalRevenue, transactionCount: transactions.length, transactions });
    } catch (error) {
      console.error('Revenue report error:', error);
      return res.status(500).json({ error: 'Failed to fetch revenue report' });
    }
  }

  static async getTripReport(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { startDate, endDate } = req.query;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const where: any = { vehicle: { currentParkId: parkManager.parkId } };
      if (startDate && endDate) {
        where.createdAt = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
      }

      const [totalTrips, completedTrips, cancelledTrips] = await Promise.all([
        prisma.trip.count({ where }),
        prisma.trip.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.trip.count({ where: { ...where, status: 'CANCELLED' } }),
      ]);

      return res.json({ totalTrips, completedTrips, cancelledTrips, inProgressTrips: totalTrips - completedTrips - cancelledTrips });
    } catch (error) {
      console.error('Trip report error:', error);
      return res.status(500).json({ error: 'Failed to fetch trip report' });
    }
  }
}
