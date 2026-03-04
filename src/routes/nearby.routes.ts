import { Router, RequestHandler } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { prisma } from '../config/database';

const router = Router();

router.get('/', authMiddleware as any, (async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 10 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'latitude and longitude are required',
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);

    const parks = await prisma.park.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
      },
    });

    const parksWithDistance = parks
      .map((park) => {
        const parkLat = Number(park.latitude);
        const parkLng = Number(park.longitude);
        const R = 6371;
        const dLat = ((parkLat - lat) * Math.PI) / 180;
        const dLng = ((parkLng - lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat * Math.PI) / 180) *
            Math.cos((parkLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return { ...park, distance: Math.round(distance * 10) / 10 };
      })
      .filter((park) => park.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      statusCode: 200,
      data: {
        parks: parksWithDistance,
        total: parksWithDistance.length,
        userLocation: { latitude: lat, longitude: lng },
        radiusKm,
      },
    });
  } catch (error) {
    next(error);
  }
}) as RequestHandler);

export default router;
