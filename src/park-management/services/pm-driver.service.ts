import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination';

export class PMDriverService {
  static async getAllDrivers(userId: string, page: number, limit: number, status?: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const { skip } = getPaginationParams({ page, limit }, limit);

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
      pagination: buildPaginationMeta(page, limit, total),
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

  static async activateDriver(driverId: string, performingUserId?: string) {
    // Update driver shift status
    const driver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        shiftStatus: 'ON_QUEUE', // Activation puts them in queue in UI
        lastCheckInDate: new Date(),
      },
      include: { vehicle: true },
    });

    // Update Vehicle.currentParkId to the activating PM's park
    // so the driver appears on this park's roster going forward
    if (performingUserId && driver.vehicle) {
      const parkManager = await prisma.parkManager.findUnique({ where: { userId: performingUserId } });
      if (parkManager?.parkId) {
        await prisma.vehicle.update({
          where: { id: driver.vehicle.id },
          data: { currentParkId: parkManager.parkId },
        });
      }
    }
  }

  static async deactivateDriver(driverId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { shiftStatus: 'OFF_SHIFT' },
    });
  }

  static async startShift(driverId: string, performingUserId?: string) {
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: { assignedRoute: true, vehicle: true },
    });
    if (!driver) throw createError('Driver not found', 404);

    let routeId = driver.assignedRouteId;
    if (!routeId) {
      const defaultRoute = await prisma.route.findFirst();
      if (defaultRoute) routeId = defaultRoute.id;
    }
    if (!routeId) throw createError('Driver has no route assigned and no default route exists', 400);

    let vehicleId = driver.vehicle?.id;
    if (!vehicleId) {
      const defaultVehicle = await prisma.vehicle.findFirst({ where: { driverId: driver.id } });
      vehicleId = defaultVehicle?.id;
    }

    const [updatedDriver, trip] = await prisma.$transaction([
      prisma.driver.update({
        where: { id: driverId },
        data: {
          shiftStatus: 'ON_SHIFT',
          lastCheckInDate: new Date(),
        },
      }),
      prisma.trip.create({
        data: {
          driverId: driver.id,
          routeId: routeId,
          vehicleId: vehicleId || '',
          passengerId: driver.userId,
          fare: driver.assignedRoute?.baseFare || 4500,
          status: 'APPROVED',
        },
      }),
    ]);

    return { driver: updatedDriver, trip };
  }

  static async endShift(driverId: string, performingUserId?: string) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw createError('Driver not found', 404);

    let parkManagerId: string | null = null;
    if (performingUserId) {
      const pm = await prisma.parkManager.findUnique({ where: { userId: performingUserId } });
      if (pm) parkManagerId = pm.id;
    }

    const activeTrip = await prisma.trip.findFirst({
      where: { driverId: driver.id, status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] } },
      include: { tripPassengers: true, transactions: true },
      orderBy: { createdAt: 'desc' },
    });

    let settlement = null;

    if (activeTrip) {
      const totalCollected = activeTrip.transactions
        .filter((t) => t.status === 'SUCCESS' && t.category === 'FARE_PAYMENT')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const [_, createdSettlement] = await prisma.$transaction([
        prisma.trip.update({
          where: { id: activeTrip.id },
          data: { status: 'COMPLETED' },
        }),
        prisma.settlement.create({
          data: {
            tripId: activeTrip.id,
            totalAmount: totalCollected || Number(activeTrip.fare),
            driverPayout: 0,
            parkCommission: 0,
            tyapFee: 0,
            status: 'APPROVED',
            approvedBy: parkManagerId,
          },
        }),
      ]);

      settlement = createdSettlement;
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: { shiftStatus: 'OFF_SHIFT' },
    });

    return { driver: updatedDriver, settlement };
  }

  static async assignRoute(driverId: string, routeId: string) {
    await prisma.driver.update({
      where: { id: driverId },
      data: { assignedRouteId: routeId },
    });
  }
}