/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMTripService } from '../services/pm-trip.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMTripController {
  static async getAvailableVehicles(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { destination } = req.query;
      if (!destination) return res.status(400).json({ error: 'Destination is required' });

      const vehicles = await PMTripService.getAvailableVehicles(userId, destination as string);
      return res.json({ vehicles });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch available vehicles');
    }
  }

  static async passengerCheckInAndPay(req: Request, res: Response) {
    try {
      const { passengerId, tripId, vehicleId } = req.body;
      if (!passengerId || !tripId || !vehicleId) return res.status(400).json({ error: 'Missing required fields' });

      const data = await PMTripService.passengerCheckInAndPay(req.user!.id, passengerId, tripId, vehicleId);

      return res.json({ success: true, message: 'Check-in Successful', data });
    } catch (error: any) {
      console.error('Check-in and pay error:', error);
      return res.status(500).json({ error: error.message || 'Failed to process check-in and payment' });
    }
  }

  static async startTrip(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

      await PMTripService.startTrip(tripId);
      return res.json({ success: true, message: 'Trip started successfully. Driver is now on-route.' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to start trip');
    }
  }

  static async endTrip(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

      await PMTripService.endTrip(tripId);
      return res.json({ success: true, message: 'Trip completed. Driver returned to queue.' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to end trip');
    }
  }
}