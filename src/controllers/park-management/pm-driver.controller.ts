import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMDriverController {
  static async getAllDrivers(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { status, page = '1', limit = '20' } = req.query;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        vehicle: { currentParkId: parkManager.parkId },
      };

      if (status === 'active') where.isAvailableToday = true;
      else if (status === 'inactive') where.isAvailableToday = false;

      const [drivers, total] = await Promise.all([
        prisma.driver.findMany({
          where,
          include: {
            user: { select: { phoneNumber: true } },
            vehicle: true,
            assignedRoute: true,
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.driver.count({ where }),
      ]);

      return res.json({
        drivers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get all drivers error:', error);
      return res.status(500).json({ error: 'Failed to fetch drivers' });
    }
  }

  static async getDriverDetails(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
        include: {
          user: { select: { phoneNumber: true, email: true } },
          vehicle: { include: { park: true } },
          assignedRoute: true,
          trips: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!driver) return res.status(404).json({ error: 'Driver not found' });
      return res.json({ driver });
    } catch (error) {
      console.error('Get driver details error:', error);
      return res.status(500).json({ error: 'Failed to fetch driver details' });
    }
  }

  static async activateDriver(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailableToday: true, lastCheckInDate: new Date() },
      });
      return res.json({ message: 'Driver activated successfully' });
    } catch (error) {
      console.error('Activate driver error:', error);
      return res.status(500).json({ error: 'Failed to activate driver' });
    }
  }

  static async deactivateDriver(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await prisma.driver.update({
        where: { id: driverId },
        data: { isAvailableToday: false },
      });
      return res.json({ message: 'Driver deactivated successfully' });
    } catch (error) {
      console.error('Deactivate driver error:', error);
      return res.status(500).json({ error: 'Failed to deactivate driver' });
    }
  }

  static async assignRoute(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      const { routeId } = req.body;
      if (!routeId) return res.status(400).json({ error: 'Route ID is required' });

      await prisma.driver.update({
        where: { id: driverId },
        data: { assignedRouteId: routeId },
      });
      return res.json({ message: 'Route assigned successfully' });
    } catch (error) {
      console.error('Assign route error:', error);
      return res.status(500).json({ error: 'Failed to assign route' });
    }
  }
}
