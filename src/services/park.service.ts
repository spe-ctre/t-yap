import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { calculateDistance, isValidCoordinates } from '../utils/location.util';

export class ParkService {
  /**
   * Find nearby parks within a specified radius
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusKm Search radius in kilometers (default: 10km)
   * @returns Array of parks with distance information
   */
  async findNearbyParks(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) {
    // Validate coordinates
    if (!isValidCoordinates(latitude, longitude)) {
      throw createError('Invalid coordinates provided', 400);
    }

    if (radiusKm <= 0 || radiusKm > 100) {
      throw createError('Radius must be between 0 and 100 kilometers', 400);
    }

    // Get all active parks
    const parks = await prisma.park.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null }
      },
      include: {
        _count: {
          select: {
            vehicles: {
              where: {
                isAvailableForBoarding: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    // Calculate distances and filter by radius
    const nearbyParks = parks
      .map((park) => {
        if (!park.latitude || !park.longitude) {
          return null;
        }

        const distance = calculateDistance(
          latitude,
          longitude,
          Number(park.latitude),
          Number(park.longitude)
        );

        if (distance <= radiusKm) {
          return {
            id: park.id,
            name: park.name,
            address: park.address,
            city: park.city,
            state: park.state,
            country: park.country,
            latitude: Number(park.latitude),
            longitude: Number(park.longitude),
            distance: parseFloat(distance.toFixed(2)), // Round to 2 decimal places
            availableVehiclesCount: park._count.vehicles,
            createdAt: park.createdAt,
            updatedAt: park.updatedAt
          };
        }
        return null;
      })
      .filter((park) => park !== null)
      .sort((a, b) => (a?.distance || 0) - (b?.distance || 0)); // Sort by distance

    return nearbyParks;
  }

  /**
   * Get park details by ID
   * @param parkId Park ID
   * @returns Park details with available vehicles count
   */
  async getParkDetails(parkId: string) {
    const park = await prisma.park.findUnique({
      where: { id: parkId },
      include: {
        _count: {
          select: {
            vehicles: {
              where: {
                isAvailableForBoarding: true,
                isActive: true
              }
            },
            agents: {
              where: {
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!park) {
      throw createError('Park not found', 404);
    }

    return {
      id: park.id,
      name: park.name,
      address: park.address,
      city: park.city,
      state: park.state,
      country: park.country,
      latitude: park.latitude ? Number(park.latitude) : null,
      longitude: park.longitude ? Number(park.longitude) : null,
      isActive: park.isActive,
      availableVehiclesCount: park._count.vehicles,
      activeAgentsCount: park._count.agents,
      createdAt: park.createdAt,
      updatedAt: park.updatedAt
    };
  }

  /**
   * Get all parks (for admin/management purposes)
   * @param filters Optional filters
   * @returns Array of parks
   */
  async getAllParks(filters?: {
    city?: string;
    state?: string;
    isActive?: boolean;
  }) {
    const parks = await prisma.park.findMany({
      where: {
        ...(filters?.city && { city: filters.city }),
        ...(filters?.state && { state: filters.state }),
        ...(filters?.isActive !== undefined && { isActive: filters.isActive })
      },
      include: {
        _count: {
          select: {
            vehicles: {
              where: {
                isAvailableForBoarding: true,
                isActive: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return parks.map((park) => ({
      id: park.id,
      name: park.name,
      address: park.address,
      city: park.city,
      state: park.state,
      country: park.country,
      latitude: park.latitude ? Number(park.latitude) : null,
      longitude: park.longitude ? Number(park.longitude) : null,
      isActive: park.isActive,
      availableVehiclesCount: park._count.vehicles,
      createdAt: park.createdAt,
      updatedAt: park.updatedAt
    }));
  }
}

