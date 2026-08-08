/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMPassengerService } from '../services/pm-passenger.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMPassengerController {
  static async getAllPassengers(req: Request, res: Response) {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const result = await PMPassengerService.getAllPassengers(
        parseInt(page as string),
        parseInt(limit as string),
        search as string | undefined
      );
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch passengers');
    }
  }

  static async activatePassenger(req: Request, res: Response) {
    try {
      const { passengerId } = req.params;
      const { biometricData } = req.body;
      if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

      await PMPassengerService.activatePassenger(passengerId, biometricData);
      return res.json({ message: 'Passenger checked in successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to activate passenger');
    }
  }

  static async checkPassengerWallet(req: Request, res: Response) {
    try {
      const { passengerId } = req.body;
      if (!passengerId) return res.status(400).json({ error: 'Passenger ID is required' });

      const result = await PMPassengerService.checkPassengerWallet(passengerId);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to check wallet balance');
    }
  }

  static async getBusManifest(req: Request, res: Response) {
    try {
      const { tripId } = req.params;
      if (!tripId) return res.status(400).json({ error: 'Trip ID is required' });

      const manifest = await PMPassengerService.getBusManifest(tripId);
      return res.json({ success: true, count: manifest.length, manifest });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch bus manifest');
    }
  }
}