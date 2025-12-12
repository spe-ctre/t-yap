import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { TripStatus } from '@prisma/client';

interface CreateTripData {
  routeId: string;
  driverId: string;
  vehicleId: string;
  passengerId: string;
  fare: number;
  isLongDistance?: boolean;
  originLatitude?: number;
  originLongitude?: number;
  destLatitude?: number;
  destLongitude?: number;
}

export class TripService {
  /**
   * Create a new trip booking
   * @param data Trip creation data
   * @returns Created trip
   */
  async createTrip(data: CreateTripData) {
    // Validate route exists
    const route = await prisma.route.findUnique({
      where: { id: data.routeId }
    });

    if (!route) {
      throw createError('Route not found', 404);
    }

    if (!route.isActive) {
      throw createError('Route is not active', 400);
    }

    // Validate driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: data.driverId }
    });

    if (!driver) {
      throw createError('Driver not found', 404);
    }

    if (!driver.isVerified) {
      throw createError('Driver is not verified', 400);
    }

    // Validate vehicle exists and belongs to driver
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId }
    });

    if (!vehicle) {
      throw createError('Vehicle not found', 404);
    }

    if (vehicle.driverId !== data.driverId) {
      throw createError('Vehicle does not belong to the specified driver', 400);
    }

    if (!vehicle.isActive || !vehicle.isVerified) {
      throw createError('Vehicle is not active or verified', 400);
    }

    // Validate passenger exists
    const passenger = await prisma.user.findUnique({
      where: { id: data.passengerId },
      include: { passenger: true }
    });

    if (!passenger) {
      throw createError('Passenger not found', 404);
    }

    if (passenger.role !== 'PASSENGER') {
      throw createError('User is not a passenger', 400);
    }

    // Create trip
    const trip = await prisma.trip.create({
      data: {
        routeId: data.routeId,
        driverId: data.driverId,
        vehicleId: data.vehicleId,
        passengerId: data.passengerId,
        fare: data.fare,
        isLongDistance: data.isLongDistance || false,
        status: 'PENDING',
        originLatitude: data.originLatitude,
        originLongitude: data.originLongitude,
        destLatitude: data.destLatitude,
        destLongitude: data.destLongitude
      },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            baseFare: true
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true
              }
            }
          }
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            vehicleType: true,
            capacity: true
          }
        },
        user: {
          select: {
            id: true,
            phoneNumber: true
          }
        }
      }
    });

    return trip;
  }

  /**
   * Get trip details by ID
   * @param tripId Trip ID
   * @returns Trip details
   */
  async getTripDetails(tripId: string) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            originPark: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true
              }
            },
            destinationPark: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true
              }
            }
          }
        },
        driver: {
          include: {
            user: {
              select: {
                id: true,
                phoneNumber: true,
                isPhoneVerified: true
              }
            },
            vehicle: {
              select: {
                id: true,
                plateNumber: true,
                make: true,
                model: true,
                vehicleType: true
              }
            }
          }
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true,
            vehicleType: true,
            capacity: true
          }
        },
        user: {
          select: {
            id: true,
            phoneNumber: true
          }
        },
        transaction: {
          select: {
            id: true,
            status: true,
            amount: true,
            reference: true
          }
        }
      }
    });

    if (!trip) {
      throw createError('Trip not found', 404);
    }

    return trip;
  }

  /**
   * Update trip status
   * @param tripId Trip ID
   * @param status New status
   * @returns Updated trip
   */
  async updateTripStatus(tripId: string, status: TripStatus) {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip) {
      throw createError('Trip not found', 404);
    }

    // Validate status transition
    const validTransitions: Record<TripStatus, TripStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };

    const allowedStatuses = validTransitions[trip.status];
    if (!allowedStatuses.includes(status)) {
      throw createError(
        `Invalid status transition from ${trip.status} to ${status}`,
        400
      );
    }

    const updateData: any = {
      status
    };

    // Set timestamps based on status
    if (status === 'IN_PROGRESS' && !trip.departureTime) {
      updateData.departureTime = new Date();
    }

    if (status === 'COMPLETED' && !trip.arrivalTime) {
      updateData.arrivalTime = new Date();
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true
          }
        }
      }
    });

    return updatedTrip;
  }

  /**
   * Get trips for a passenger
   * @param passengerId Passenger ID
   * @param filters Optional filters
   * @returns Array of trips
   */
  async getPassengerTrips(
    passengerId: string,
    filters?: {
      status?: TripStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    const trips = await prisma.trip.findMany({
      where: {
        passengerId,
        ...(filters?.status && { status: filters.status })
      },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true,
            baseFare: true
          }
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            make: true,
            model: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    });

    return trips;
  }

  /**
   * Get trips for a driver
   * @param driverId Driver ID
   * @param filters Optional filters
   * @returns Array of trips
   */
  async getDriverTrips(
    driverId: string,
    filters?: {
      status?: TripStatus;
      limit?: number;
      offset?: number;
    }
  ) {
    const trips = await prisma.trip.findMany({
      where: {
        driverId,
        ...(filters?.status && { status: filters.status })
      },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            origin: true,
            destination: true
          }
        },
        user: {
          select: {
            id: true,
            phoneNumber: true
          }
        },
        vehicle: {
          select: {
            id: true,
            plateNumber: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    });

    return trips;
  }
}

