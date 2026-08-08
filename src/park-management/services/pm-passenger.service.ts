import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination';

const FARE_REQUIRED = 250;

export class PMPassengerService {
  static async getAllPassengers(page: number, limit: number, search?: string) {
    const { skip } = getPaginationParams({ page, limit }, limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [passengers, total] = await Promise.all([
      prisma.passenger.findMany({
        where,
        include: { user: { select: { phoneNumber: true, email: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.passenger.count({ where }),
    ]);

    return {
      passengers,
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  static async activatePassenger(passengerId: string, biometricData: string) {
    const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
    if (!passenger) throw createError('Passenger not found', 404);

    if (passenger.biometricData !== biometricData) {
      throw createError('Biometric verification failed', 401);
    }
  }

  static async checkPassengerWallet(passengerId: string) {
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { id: true, firstName: true, lastName: true, walletBalance: true },
    });

    if (!passenger) throw createError('Passenger not found', 404);

    return {
      balance: Number(passenger.walletBalance),
      fareRequired: FARE_REQUIRED,
      canPay: Number(passenger.walletBalance) >= FARE_REQUIRED,
      passenger,
    };
  }

  static async getBusManifest(tripId: string) {
    const tripPassengers = await prisma.tripPassenger.findMany({
      where: { tripId },
      include: {
        passenger: {
          select: {
            firstName: true,
            lastName: true,
            nextOfKinName: true,
            nextOfKinPhone: true,
            nextOfKinRelationship: true,
          },
        },
      },
      orderBy: { checkInTime: 'asc' },
    });

    const manifest = tripPassengers.map((tp, index) => ({
      seatNo: index + 1,
      name: `${tp.passenger.firstName} ${tp.passenger.lastName}`,
      nextOfKin: tp.passenger.nextOfKinName || 'N/A',
      nokPhone: tp.passenger.nextOfKinPhone || 'N/A',
      relationship: tp.passenger.nextOfKinRelationship || 'N/A',
    }));

    return manifest;
  }
}