/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../shared/config/database';

export class PMVehicleController {
  static async getAllVehicles(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '20' } = req.query;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [vehicles, total] = await Promise.all([
        prisma.vehicle.findMany({
          where: { currentParkId: parkManager.parkId },
          include: {
            driver: { select: { firstName: true, lastName: true } },
            park: true,
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.vehicle.count({ where: { currentParkId: parkManager.parkId } }),
      ]);

      return res.json({
        vehicles,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      console.error('Get all vehicles error:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  }

  static async getVehicleDetails(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          driver: true,
          park: true,
          trips: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
      return res.json({ vehicle });
    } catch (error) {
      console.error('Get vehicle details error:', error);
      return res.status(500).json({ error: 'Failed to fetch vehicle details' });
    }
  }

  static async approveVehicle(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isVerified: true, isActive: true },
      });
      return res.json({ message: 'Vehicle approved successfully' });
    } catch (error) {
      console.error('Approve vehicle error:', error);
      return res.status(500).json({ error: 'Failed to approve vehicle' });
    }
  }

  static async deactivateVehicle(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { isActive: false, isAvailableForBoarding: false },
      });
      return res.json({ message: 'Vehicle deactivated successfully' });
    } catch (error) {
      console.error('Deactivate vehicle error:', error);
      return res.status(500).json({ error: 'Failed to deactivate vehicle' });
    }
  }
}
