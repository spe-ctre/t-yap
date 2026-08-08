/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMVehicleService } from '../services/pm-vehicle.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMVehicleController {
  static async getAllVehicles(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '20' } = req.query;
      const result = await PMVehicleService.getAllVehicles(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch vehicles');
    }
  }

  static async getVehicleDetails(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      const vehicle = await PMVehicleService.getVehicleDetails(vehicleId);
      return res.json({ vehicle });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch vehicle details');
    }
  }

  static async approveVehicle(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      await PMVehicleService.approveVehicle(vehicleId);
      return res.json({ message: 'Vehicle approved successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to approve vehicle');
    }
  }

  static async deactivateVehicle(req: Request, res: Response) {
    try {
      const { vehicleId } = req.params;
      await PMVehicleService.deactivateVehicle(vehicleId);
      return res.json({ message: 'Vehicle deactivated successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to deactivate vehicle');
    }
  }
}