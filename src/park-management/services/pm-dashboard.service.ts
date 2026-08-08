import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';

export class PMDashboardService {
  static async getDashboard(userId: string) {
    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!parkManager) throw createError('Park Manager not found', 404);

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
      recentTransactions.map(async (transaction: any) => {
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

    return {
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
    };
  }

  static async startShift(userId: string, biometricData: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    if (parkManager.biometricData !== biometricData) {
      throw createError('Biometric verification failed', 401);
    }

    // NOTE: preserved as-is from original — does not persist shift state to the database.
    return { shiftStart: new Date() };
  }

  static async endShift() {
    // NOTE: preserved as-is from original — no auth/biometric check, no database update.
    return { shiftEnd: new Date() };
  }
}