/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { NearbyService } from '../services/nearby.service';

export class NearbyController {
  /**
   * GET /api/nearby
   */
  static async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude, radius } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'latitude and longitude are required',
        });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const radiusKm = radius ? parseFloat(radius as string) : 10;

      const result = await NearbyService.findNearbyParks(lat, lng, radiusKm);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}
