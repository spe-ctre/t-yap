import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMSettingsController {
  static async getParkDetails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });

      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      return res.json({ park: parkManager.park, commissionRate: parkManager.commissionRate });
    } catch (error) {
      console.error('Get park details error:', error);
      return res.status(500).json({ error: 'Failed to fetch park details' });
    }
  }

  static async updateParkSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { commissionRate } = req.body;

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      if (commissionRate !== undefined) {
        await prisma.parkManager.update({
          where: { id: parkManager.id },
          data: { commissionRate: Number(commissionRate) },
        });
      }

      return res.json({ message: 'Settings updated successfully', commissionRate });
    } catch (error) {
      console.error('Update settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  }

  static async getParksList(req: Request, res: Response) {
    try {
      const parks = await prisma.park.findMany({
        where: { isActive: true },
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      });

      return res.json({ parks: parks.map(p => ({ id: p.id, name: p.name, location: p.address })) });
    } catch (error) {
      console.error('Get parks list error:', error);
      return res.status(500).json({ error: 'Failed to fetch parks list' });
    }
  }
}
