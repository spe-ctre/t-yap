import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';

export class PMDriverService {
  static async getAllDrivers(userId: string, page: number, limit: number, status?: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const skip = (page - 1) * limit;

    const where: any = {
      vehicle: { currentParkId: parkManager.parkId },
    };

    if (status === 'active') where.shiftStatus = 'ON_SHIFT';
    else if (status === 'inactive') where.shiftStatus = 'OFF_SHIFT';
    else if (status === 'queue') where.shiftStatus = 'ON_QUEUE';

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: { select: { phoneNumber: true } },
          vehicle: true,
          assignedRoute: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.driver.count({ where }),
    ]);

    return {
      drivers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getDriverDetails(driverId: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { phoneNumber: true, email: true } },
        vehicle: { include: { park: true } },
        assignedRoute: true,
        trips: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!driver) throw createError('Driver not found', 404);
    return driver;
  }

  static async activateDriver(driverId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        shiftStatus: 'ON_QUEUE', // Activation puts them in queue in UI
        lastCheckInDate: new Date(),
      },
    });
  }

  static async deactivateDriver(driverId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { shiftStatus: 'OFF_SHIFT' },
    });
  }

  static async startShift(driverId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { shiftStatus: 'ON_SHIFT' },
    });
  }

  static async endShift(driverId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { shiftStatus: 'OFF_SHIFT' },
    });
  }

  static async assignRoute(driverId: string, routeId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { assignedRouteId: routeId },
    });
  }
}