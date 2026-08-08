import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';

interface TransactionFilters {
  driverId?: string;
  routeId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export class PMTransactionService {
  static async getAllTransactions(
    userId: string,
    page: number,
    limit: number,
    filters: TransactionFilters
  ) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const skip = (page - 1) * limit;
    const { driverId, routeId, status, startDate, endDate, search } = filters;

    const where: any = {
      // Transactions related to this park via trip/vehicle
      trip: {
        vehicle: { currentParkId: parkManager.parkId },
      },
    };

    if (driverId) where.trip = { ...where.trip, driverId };
    if (routeId) where.trip = { ...where.trip, routeId };
    if (status) where.status = status;

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (search) {
      where.OR = [
        { trip: { driver: { firstName: { contains: search, mode: 'insensitive' } } } },
        { trip: { driver: { lastName: { contains: search, mode: 'insensitive' } } } },
        { reference: { contains: search, mode: 'insensitive' } },
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
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      time: t.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      date: t.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }),
      driver: t.trip?.driver ? `${t.trip.driver.firstName} ${t.trip.driver.lastName}` : 'System',
      route: t.trip?.route?.name || 'N/A',
      amount: Number(t.amount),
      paymentStatus: t.status,
      reference: t.reference,
    }));

    return {
      transactions: formattedTransactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}