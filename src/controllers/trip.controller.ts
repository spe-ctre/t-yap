import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client'; 
import { TripService } from '../services/trip.service';
import { createError } from '../middleware/error.middleware';
import { TripStatus } from '@prisma/client';
import {
  createTripSchema,
  tripIdParamSchema,
  updateTripStatusSchema,
  tripQuerySchema
} from '../utils/validation';
import { getValidationErrorMessage } from '../utils/validation-error.util';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: UserRole;
  };
}

export class TripController {
  private tripService: TripService;

  constructor() {
    this.tripService = new TripService();
  }

  /**
   * POST /api/trips
   * Create a new trip booking
   */
  createTrip = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = createTripSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const {
        routeId,
        driverId,
        vehicleId,
        fare,
        isLongDistance,
        originLatitude,
        originLongitude,
        destLatitude,
        destLongitude
      } = req.body;

      // Use authenticated user as passenger
      const passengerId = req.user.id;

      const trip = await this.tripService.createTrip({
        routeId,
        driverId,
        vehicleId,
        passengerId,
        fare: parseFloat(fare),
        isLongDistance: isLongDistance || false,
        originLatitude: originLatitude ? parseFloat(originLatitude) : undefined,
        originLongitude: originLongitude
          ? parseFloat(originLongitude)
          : undefined,
        destLatitude: destLatitude ? parseFloat(destLatitude) : undefined,
        destLongitude: destLongitude ? parseFloat(destLongitude) : undefined
      });

      res.status(201).json({
        success: true,
        statusCode: 201,
        message: 'Trip created successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/trips/:tripId
   * Get trip details
   */
  getTripDetails = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = tripIdParamSchema.validate(req.params);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const { tripId } = req.params;

      const trip = await this.tripService.getTripDetails(tripId);

      res.json({
        success: true,
        statusCode: 200,
        data: trip
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /api/trips/:tripId/status
   * Update trip status
   */
  updateTripStatus = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error: paramError } = tripIdParamSchema.validate(req.params);
      if (paramError) {
        const message = getValidationErrorMessage(paramError) || 'Validation failed';
        throw createError(message, 400);
      }

      const { error: bodyError } = updateTripStatusSchema.validate(req.body);
      if (bodyError) {
        const message = getValidationErrorMessage(bodyError) || 'Validation failed';
        throw createError(message, 400);
      }

      const { tripId } = req.params;
      const { status } = req.body;

      const trip = await this.tripService.updateTripStatus(
        tripId,
        status as TripStatus
      );

      res.json({
        success: true,
        statusCode: 200,
        message: 'Trip status updated successfully',
        data: trip
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/trips/passenger/my-trips
   * Get trips for authenticated passenger
   */
  getMyTrips = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { error } = tripQuerySchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const passengerId = req.user.id;
      const status = req.query.status as TripStatus | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : 50;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const trips = await this.tripService.getPassengerTrips(passengerId, {
        status,
        limit,
        offset
      });

      res.json({
        success: true,
        statusCode: 200,
        data: trips,
        pagination: {
          limit,
          offset,
          total: trips.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/trips/driver/my-trips
   * Get trips for authenticated driver
   */
  getDriverTrips = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Verify user is a driver
      if (req.user.role !== 'DRIVER') {
        throw createError('Only drivers can access this endpoint', 403);
      }

      const { error } = tripQuerySchema.validate(req.query);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const driverId = req.user.id;
      const status = req.query.status as TripStatus | undefined;
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : 50;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const trips = await this.tripService.getDriverTrips(driverId, {
        status,
        limit,
        offset
      });

      res.json({
        success: true,
        statusCode: 200,
        data: trips,
        pagination: {
          limit,
          offset,
          total: trips.length
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

