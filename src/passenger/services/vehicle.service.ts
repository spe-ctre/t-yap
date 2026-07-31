import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class VehicleService {
  /**
   * Get vehicles available at a specific park
   * @param parkId Park ID
   * @returns Array of available vehicles with driver information
   */
  async getVehiclesByPark(parkId: string) {
    // Verify park exists
    const park = await prisma.park.findUnique({
      where: { id: parkId }
    });

    if (!park) {
      throw createError('Park not found', 404);
    }

    const vehicles = await prisma.vehicle.findMany({
      where: {
        currentParkId: parkId,
        isAvailableForBoarding: true,
        isActive: true,
        isVerified: true
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                isPhoneVerified: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return vehicles.map((vehicle) => ({
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      capacity: vehicle.capacity,
      vehicleType: vehicle.vehicleType,
      isVerified: vehicle.isVerified,
      driver: {
        id: vehicle.driver.id,
        firstName: vehicle.driver.firstName,
        lastName: vehicle.driver.lastName,
        licenseNumber: vehicle.driver.licenseNumber,
        phoneNumber: vehicle.driver.user.phoneNumber,
        isPhoneVerified: vehicle.driver.user.isPhoneVerified
      },
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    }));
  }

  /**
   * Get vehicle details by ID
   * @param vehicleId Vehicle ID
   * @returns Vehicle details with driver and park information
   */
  async getVehicleDetails(vehicleId: string) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: {
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                isPhoneVerified: true
              }
            }
          }
        },
        park: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true
          }
        }
      }
    });

    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    return {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      capacity: vehicle.capacity,
      vehicleType: vehicle.vehicleType,
      isVerified: vehicle.isVerified,
      isActive: vehicle.isActive,
      isAvailableForBoarding: vehicle.isAvailableForBoarding,
      driver: {
        id: vehicle.driver.id,
        firstName: vehicle.driver.firstName,
        lastName: vehicle.driver.lastName,
        licenseNumber: vehicle.driver.licenseNumber,
        phoneNumber: vehicle.driver.user.phoneNumber,
        isPhoneVerified: vehicle.driver.user.isPhoneVerified
      },
      currentPark: vehicle.park
        ? {
            id: vehicle.park.id,
            name: vehicle.park.name,
            address: vehicle.park.address,
            city: vehicle.park.city,
            state: vehicle.park.state
          }
        : null,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt
    };
  }

  /**
   * Update vehicle availability status
   * @param vehicleId Vehicle ID
   * @param isAvailable Availability status
   * @param parkId Optional park ID to update location
   * @returns Updated vehicle
   */
  async updateVehicleAvailability(
    vehicleId: string,
    isAvailable: boolean,
    parkId?: string
  ) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    // If parkId is provided, verify it exists
    if (parkId) {
      const park = await prisma.park.findUnique({
        where: { id: parkId }
      });

      if (!park) {
        throw createError('Park not found', 404);
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        isAvailableForBoarding: isAvailable,
        ...(parkId && { currentParkId: parkId })
      },
      include: {
        park: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    return {
      id: updatedVehicle.id,
      plateNumber: updatedVehicle.plateNumber,
      isAvailableForBoarding: updatedVehicle.isAvailableForBoarding,
      currentPark: updatedVehicle.park,
      updatedAt: updatedVehicle.updatedAt
    };
  }
}

