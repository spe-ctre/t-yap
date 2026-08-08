/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMDriverService } from '../services/pm-driver.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMDriverController {
  static async getAllDrivers(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { status, page = '1', limit = '20' } = req.query;
      const result = await PMDriverService.getAllDrivers(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        status as string | undefined
      );
      return res.json(result);
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch drivers');
    }
  }

  static async getDriverDetails(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      const driver = await PMDriverService.getDriverDetails(driverId);
      return res.json({ driver });
    } catch (error: any) {
      return handleError(res, error, 'Failed to fetch driver details');
    }
  }

  static async activateDriver(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await PMDriverService.activateDriver(driverId);
      return res.json({ message: 'Driver activated and placed on queue successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to activate driver');
    }
  }

  static async deactivateDriver(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await PMDriverService.deactivateDriver(driverId);
      return res.json({ message: 'Driver deactivated successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to deactivate driver');
    }
  }

  static async startShift(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await PMDriverService.startShift(driverId);
      return res.json({ message: 'Driver shift started successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to start shift');
    }
  }

  static async endShift(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      await PMDriverService.endShift(driverId);
      return res.json({ message: 'Driver shift ended successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to end shift');
    }
  }

  static async assignRoute(req: Request, res: Response) {
    try {
      const { driverId } = req.params;
      const { routeId } = req.body;
      if (!routeId) return res.status(400).json({ error: 'Route ID is required' });

      await PMDriverService.assignRoute(driverId, routeId);
      return res.json({ message: 'Route assigned successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to assign route');
    }
  }
}