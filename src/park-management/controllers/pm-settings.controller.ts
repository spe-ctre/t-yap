/// <reference path="../../shared/types/express" />
import { Request, Response } from 'express';
import { prisma } from '../../shared/config/database';
import * as bcrypt from 'bcryptjs';

export class PMSettingsController {
  static async getParkDetails(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;
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
  static async setTransactionPin(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { pin } = req.body;

      if (!pin || pin.length !== 4) {
        return res.status(400).json({ error: '4-digit PIN is required' });
      }

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      // In production, we should hash this, but the schema uses a String field. 
      // Using simple hashing for security.
      const hashedPin = await bcrypt.hash(pin, 10);

      await prisma.parkManager.update({
        where: { id: parkManager.id },
        data: { transactionPin: hashedPin },
      });

      return res.json({ message: 'PIN created successfully' });
    } catch (error) {
      console.error('Set PIN error:', error);
      return res.status(500).json({ error: 'Failed to set transaction PIN' });
    }
  }
}
