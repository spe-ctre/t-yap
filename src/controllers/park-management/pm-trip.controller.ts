import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMTripController {
  static async getAvailableVehicles(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { destination } = req.query;
      if (!destination) return res.status(400).json({ error: 'Destination is required' });

      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

      const activeTrips = await prisma.trip.findMany({
        where: { status: 'PENDING', route: { destination: destination as string } },
        include: {
          vehicle: { include: { driver: { select: { id: true, firstName: true, lastName: true } } } },
          route: { select: { id: true, name: true, destination: true } },
        },
      });

      const formattedVehicles = activeTrips
        .filter((trip) => trip.vehicle.currentParkId === parkManager.parkId && trip.vehicle.isActive && trip.vehicle.isAvailableForBoarding)
        .map((trip) => ({
          id: trip.vehicle.id,
          plateNumber: trip.vehicle.plateNumber,
          capacity: trip.vehicle.capacity,
          currentPassengers: 0,
          availableSeats: trip.vehicle.capacity,
          driver: trip.vehicle.driver,
          route: trip.route,
        }));

      return res.json({ vehicles: formattedVehicles });
    } catch (error) {
      console.error('Get available vehicles error:', error);
      return res.status(500).json({ error: 'Failed to fetch available vehicles' });
    }
  }

  static async passengerCheckInAndPay(req: Request, res: Response) {
    try {
      const { passengerId, tripId, vehicleId } = req.body;
      if (!passengerId || !tripId || !vehicleId) return res.status(400).json({ error: 'Missing required fields' });

      const result = await prisma.$transaction(async (tx) => {
        const passenger = await tx.passenger.findUnique({ where: { id: passengerId } });
        if (!passenger) throw new Error('Passenger not found');

        const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { route: true } });
        if (!trip) throw new Error('Trip not found');

        const fare = Number(trip.route.baseFare) || 250;
        const currentBalance = Number(passenger.walletBalance);

        if (currentBalance < fare) throw new Error('Insufficient balance');

        const transaction = await tx.transaction.create({
          data: {
            type: 'DEBIT',
            category: 'FARE_PAYMENT',
            status: 'SUCCESS',
            amount: fare,
            description: `Fare payment for trip ${trip.route.name}`,
            reference: `FARE-${Date.now()}`,
            userType: 'PASSENGER',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - fare,
            user: { connect: { id: passengerId } },
          },
        });

        await tx.passenger.update({
          where: { id: passengerId },
          data: { walletBalance: { decrement: fare } },
        });

        const tripPassengerRecord = await tx.tripPassenger.create({
          data: { tripId, passengerId, vehicleId, isPaid: true, checkInTime: new Date() },
        });

        return { transaction, tripPassengerRecord };
      });

      return res.json({ success: true, message: 'Check-in and payment successful', data: result });
    } catch (error: any) {
      console.error('Check-in and pay error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process check-in and payment' });
    }
  }
}
