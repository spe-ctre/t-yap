import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import * as bcrypt from 'bcryptjs';

export class PMSettingsService {
  static async getParkDetails(userId: string) {
    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!parkManager) throw createError('Park Manager not found', 404);

    return { park: parkManager.park, commissionRate: parkManager.commissionRate };
  }

  static async updateParkSettings(userId: string, commissionRate?: number) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    if (commissionRate !== undefined) {
      await prisma.parkManager.update({
        where: { id: parkManager.id },
        data: { commissionRate: Number(commissionRate) },
      });
    }

    return { message: 'Settings updated successfully', commissionRate };
  }

  static async getParksList() {
    const parks = await prisma.park.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });

    return parks.map((p) => ({ id: p.id, name: p.name, location: p.address }));
  }

  static async setTransactionPin(userId: string, pin: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    // In production, we should hash this, but the schema uses a String field.
    // Using simple hashing for security.
    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.parkManager.update({
      where: { id: parkManager.id },
      data: { transactionPin: hashedPin },
    });
  }
}