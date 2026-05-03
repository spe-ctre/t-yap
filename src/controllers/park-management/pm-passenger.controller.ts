import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMPassengerController {
  static async getAllPassengers(req: Request, res: Response) {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};
      if (search) {
        where.OR = [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [passengers, total] = await Promise.all([
        prisma.passenger.findMany({
          where,
          include: { user: { select: { phoneNumber: true, email: true } } },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.passenger.count({ where }),
      ]);

      return res.json({
        passengers,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      });
    } catch (error) {
      console.error('Get all passengers error:', error);
      return res.status(500).json({ error: 'Failed to fetch passengers' });
    }
  }

  static async activatePassenger(req: Request, res: Response) {
    try {
      const { passengerId } = req.params;
      const { biometricData } = req.body;
      if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

      const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
      if (!passenger) return res.status(404).json({ error: 'Passenger not found' });

      if (passenger.biometricData !== biometricData) {
        return res.status(401).json({ error: 'Biometric verification failed' });
      }

      return res.json({ message: 'Passenger checked in successfully' });
    } catch (error) {
      console.error('Activate passenger error:', error);
      return res.status(500).json({ error: 'Failed to activate passenger' });
    }
  }

  static async checkPassengerWallet(req: Request, res: Response) {
    try {
      const { passengerId } = req.body;
      if (!passengerId) return res.status(400).json({ error: 'Passenger ID is required' });

      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: { id: true, firstName: true, lastName: true, walletBalance: true },
      });

      if (!passenger) return res.status(404).json({ error: 'Passenger not found' });

      return res.json({
        success: true,
        balance: Number(passenger.walletBalance),
        fareRequired: 250,
        canPay: Number(passenger.walletBalance) >= 250,
        passenger,
      });
    } catch (error) {
      console.error('Check wallet error:', error);
      return res.status(500).json({ error: 'Failed to check wallet balance' });
    }
  }
  static async getBusManifest(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

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
            }
          }
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

      return res.json({ 
        success: true, 
        count: manifest.length,
        manifest 
      });
    } catch (error) {
      console.error('Get bus manifest error:', error);
      return res.status(500).json({ error: 'Failed to fetch bus manifest' });
    }
  }
}
