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
        const passenger = await tx.passenger.findUnique({ 
          where: { id: passengerId },
          include: { user: true } 
        });
        if (!passenger) throw new Error('Passenger not found');

        const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { route: true } });
        if (!trip) throw new Error('Trip not found');

        // Logic from UI: Total = Fare + Transaction Fee (10 NGN)
        const fare = Number(trip.route.baseFare) || 4500;
        const transactionFee = 10;
        const totalDeduction = fare + transactionFee;
        const currentBalance = Number(passenger.transportWalletBalance); // Using transportWalletBalance from Passenger model

        if (currentBalance < totalDeduction) throw new Error('Insufficient balance');

        // 1. Create main transaction (Fare)
        const transaction = await tx.transaction.create({
          data: {
            type: 'DEBIT',
            category: 'FARE_PAYMENT',
            status: 'SUCCESS',
            amount: totalDeduction,
            description: `Check-in for ${trip.route.name} (Fare: ${fare}, Fee: ${transactionFee})`,
            reference: `FARE-${Date.now()}`,
            userType: 'PASSENGER',
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - totalDeduction,
            user: { connect: { id: passenger.userId } },
          },
        });

        // 2. Deduct from passenger
        await tx.passenger.update({
          where: { id: passengerId },
          data: { transportWalletBalance: { decrement: totalDeduction } },
        });

        const tripPassengerRecord = await tx.tripPassenger.create({
          data: { tripId, passengerId, vehicleId, isPaid: true, checkInTime: new Date() },
        });

        // 3. IMMEDIATELY split the revenue (Pay-on-Entry model)
        try {
          const { RevenueService, RevenueType } = require('../../services/admin/revenue.service');
          // Fetch the PM ID of the manager performing the check-in
          const currentPM = await tx.parkManager.findUnique({ where: { userId: (req as any).user?.id } });
          
          await RevenueService.processRevenue(RevenueType.TRIP_FARE, fare, {
            tripId,
            driverId: trip.driverId,
            pmId: currentPM?.id || trip.route.originParkId || trip.route.destinationParkId
          });
          console.log(`💰 Revenue split processed IMMEDIATELY at boarding for Trip ${tripId}`);
        } catch (revError) {
          console.error('Revenue split failed at boarding, but check-in proceeded:', revError);
        }

        return { 
          transaction, 
          tripPassengerRecord, 
          passengerName: `${passenger.firstName} ${passenger.lastName}`,
          amountDeducted: totalDeduction,
          fare,
          transactionFee
        };
      });

      return res.json({ 
        success: true, 
        message: 'Check-in Successful', 
        data: result 
      });
    } catch (error: any) {
      console.error('Check-in and pay error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process check-in and payment' });
    }
  }
  static async startTrip(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

      const trip = await prisma.trip.findUnique({ where: { id: tripId }, include: { driver: true, vehicle: true } });
      if (!trip) return res.status(404).json({ error: 'Trip not found' });

      await prisma.$transaction([
        prisma.trip.update({ where: { id: tripId }, data: { status: 'IN_PROGRESS' } }),
        prisma.driver.update({ where: { id: trip.driverId }, data: { shiftStatus: 'ON_SHIFT' } }),
      ]);

      return res.json({ success: true, message: 'Trip started successfully. Driver is now on-route.' });
    } catch (error) {
      console.error('Start trip error:', error);
      return res.status(500).json({ error: 'Failed to start trip' });
    }
  }

  static async endTrip(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

      const trip = await prisma.trip.findUnique({ where: { id: tripId } });
      if (!trip) return res.status(404).json({ error: 'Trip not found' });

      await prisma.$transaction([
        prisma.trip.update({ where: { id: tripId }, data: { status: 'COMPLETED' } }),
        prisma.driver.update({ where: { id: trip.driverId }, data: { shiftStatus: 'ON_QUEUE' } }),
      ]);

      return res.json({ success: true, message: 'Trip completed. Driver returned to queue.' });
    } catch (error) {
      console.error('End trip error:', error);
      return res.status(500).json({ error: 'Failed to end trip' });
    }
  }
}
