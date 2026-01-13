import { Request, Response, NextFunction } from 'express';
import { TRideService } from '../services/t-ride.service';
import { createError } from '../middleware/error.middleware';
import {
  nearbyParksQuerySchema,
  parkIdParamSchema,
  vehicleIdParamSchema
} from '../utils/validation';
import { getValidationErrorMessage } from '../utils/validation-error.util';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: 'PASSENGER' | 'DRIVER' | 'AGENT' | 'PARK_MANAGER';
  };
}

export class TRideController {
  private tRideService: TRideService;

  constructor() {
    this.tRideService = new TRideService();
  }

  /**
   * GET /api/t-ride/nearby-parks
   * Get nearby parks with available vehicles
   */
  getNearbyParks = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = nearbyParksQuerySchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      const radius = req.query.radius
        ? parseFloat(req.query.radius as string)
        : 10;

      const result = await this.tRideService.getNearbyParks(
        latitude,
        longitude,
        radius
      );

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/t-ride/parks/:parkId
   * Get park details
   */
  getParkDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = parkIdParamSchema.validate(req.params);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { parkId } = req.params;

      const result = await this.tRideService.getParkDetails(parkId);

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/t-ride/parks/:parkId/vehicles
   * Get available vehicles at a park
   */
  getAvailableVehiclesAtPark = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = parkIdParamSchema.validate(req.params);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { parkId } = req.params;

      const result = await this.tRideService.getAvailableVehiclesAtPark(parkId);

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/t-ride/vehicles/:vehicleId
   * Get vehicle details
   */
  getVehicleDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = vehicleIdParamSchema.validate(req.params);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { vehicleId } = req.params;

      const result = await this.tRideService.getVehicleDetails(vehicleId);

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/t-ride/parks-with-vehicles
   * Get parks with vehicles ready for onboarding
   */
  getParksWithAvailableVehicles = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = nearbyParksQuerySchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const latitude = parseFloat(req.query.latitude as string);
      const longitude = parseFloat(req.query.longitude as string);
      const radius = req.query.radius
        ? parseFloat(req.query.radius as string)
        : 10;

      const result = await this.tRideService.getParksWithAvailableVehicles(
        latitude,
        longitude,
        radius
      );

      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
}

