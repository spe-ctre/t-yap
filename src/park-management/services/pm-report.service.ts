import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';

export class PMReportService {
  static async getRevenueReport(userId: string, startDate?: string, endDate?: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const where: any = {
      category: 'FARE_PAYMENT',
      status: 'SUCCESS',
      vehicle: { currentParkId: parkManager.parkId },
    };

    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

    return { totalRevenue, transactionCount: transactions.length, transactions };
  }

  static async getTripReport(userId: string, startDate?: string, endDate?: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const where: any = { vehicle: { currentParkId: parkManager.parkId } };
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    const [totalTrips, completedTrips, cancelledTrips] = await Promise.all([
      prisma.trip.count({ where }),
      prisma.trip.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.trip.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);

    return {
      totalTrips,
      completedTrips,
      cancelledTrips,
      inProgressTrips: totalTrips - completedTrips - cancelledTrips,
    };
  }
}