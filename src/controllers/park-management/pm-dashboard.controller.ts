/// <reference path="../../types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMDashboardController {
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });

      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayRevenue = await prisma.transaction.aggregate({
        where: {
          createdAt: { gte: today },
          status: 'SUCCESS',
          category: 'FARE_PAYMENT',
        },
        _sum: { amount: true },
      });

      const activeDrivers = await prisma.driver.count({
        where: {
          shiftStatus: 'ON_SHIFT',
          vehicle: { currentParkId: parkManager.parkId },
        },
      });

      const totalDrivers = await prisma.driver.count({
        where: { vehicle: { currentParkId: parkManager.parkId } },
      });

      const todayTrips = await prisma.trip.count({
        where: {
          createdAt: { gte: today },
          vehicle: { currentParkId: parkManager.parkId },
        },
      });

      const recentTransactions = await prisma.transaction.findMany({
        where: {
          category: 'FARE_PAYMENT',
          status: 'SUCCESS',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      });

      const formattedTransactions = await Promise.all(
        recentTransactions.map(async (transaction) => {
          const trip = await prisma.trip.findFirst({
            where: {
              passengerId: transaction.userId,
              createdAt: {
                gte: new Date(transaction.createdAt.getTime() - 60000),
                lte: new Date(transaction.createdAt.getTime() + 60000),
              },
            },
            include: {
              driver: { select: { firstName: true, lastName: true } },
              route: { select: { name: true } },
            },
          });

          return {
            time: transaction.createdAt.toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
            driverName: trip?.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : 'N/A',
            route: trip?.route?.name || 'N/A',
            amount: `₦${Number(transaction.amount).toLocaleString()}`,
            paymentStatus: 'Paid',
          };
        })
      );

      return res.json({
        parkManager: {
          id: parkManager.id,
          firstName: parkManager.firstName,
          lastName: parkManager.lastName,
        },
        park: parkManager.park,
        stats: {
          activeDriversToday: activeDrivers,
          earningsToday: todayRevenue._sum.amount || 0,
          transactionsToday: todayTrips, // Count of trips is count of transactions
          commissionsEarned: Number(todayRevenue._sum.amount || 0) * 0.1, // Placeholder 10%
        },
        recentTransactions: formattedTransactions,
      });
    } catch (error) {
      console.error('Get dashboard error:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
  }

  static async startShift(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { biometricData } = req.body;

      if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      if (parkManager.biometricData !== biometricData) {
        return res.status(401).json({ error: 'Biometric verification failed' });
      }

      return res.json({
        message: 'Shift started successfully',
        shiftStart: new Date(),
      });
    } catch (error) {
      console.error('Start shift error:', error);
      return res.status(500).json({ error: 'Failed to start shift' });
    }
  }

  static async endShift(req: Request, res: Response) {
    try {
      return res.json({
        message: 'Shift ended successfully',
        shiftEnd: new Date(),
      });
    } catch (error) {
      console.error('End shift error:', error);
      return res.status(500).json({ error: 'Failed to end shift' });
    }
  }
}
