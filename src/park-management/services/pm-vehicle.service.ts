import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';

export class PMVehicleService {
  static async getAllVehicles(userId: string, page: number, limit: number) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: { currentParkId: parkManager.parkId },
        include: {
          driver: { select: { firstName: true, lastName: true } },
          park: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where: { currentParkId: parkManager.parkId } }),
    ]);

    return {
      vehicles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getVehicleDetails(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: true,
        park: true,
        trips: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!vehicle) throw createError('Vehicle not found', 404);
    return vehicle;
  }

  static async approveVehicle(vehicleId: string) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isVerified: true, isActive: true },
    });
  }

  static async deactivateVehicle(vehicleId: string) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false, isAvailableForBoarding: false },
    });
  }
}