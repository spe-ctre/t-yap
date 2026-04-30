import { prisma } from '../config/database';

export class NearbyService {
  /**
   * Find nearby parks based on coordinates and radius
   */
  static async findNearbyParks(lat: number, lng: number, radiusKm: number = 10) {
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
        
        // Haversine formula
        const R = 6371; // Earth's radius in km
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
        
        return { 
          ...park, 
          distance: Math.round(distance * 10) / 10 
        };
      })
      .filter((park) => park.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return {
      parks: parksWithDistance,
      total: parksWithDistance.length,
      userLocation: { latitude: lat, longitude: lng },
      radiusKm,
    };
  }
}
