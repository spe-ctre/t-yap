import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// PART 1: AUTHENTICATION & ONBOARDING (6 endpoints)
// ============================================

export const deviceSetup = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceModel, osVersion } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'Device ID is required' });

    const existingDevice = await prisma.userSession.findFirst({
      where: { deviceId },
    });

    if (existingDevice) {
      await prisma.userSession.update({
        where: { id: existingDevice.id },
        data: { lastActivity: new Date() },
      });
      return res.json({ message: 'Device already registered' });
    }

    return res.json({ message: 'Device initialized successfully', deviceId });
  } catch (error) {
    console.error('Device setup error:', error);
    return res.status(500).json({ error: 'Failed to initialize device' });
  }
};

export const sendParkManagerRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser && existingUser.role === 'PARK_MANAGER') {
      return res.status(400).json({ error: 'Park Manager already exists' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user = existingUser;
    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@tyap.parkmanager`,
          password: await bcrypt.hash(Math.random().toString(), 10),
          role: 'PARK_MANAGER',
        },
      });
    }

    await prisma.verificationCode.create({
      data: { userId: user.id, code: otpCode, type: 'PHONE_VERIFICATION', expiresAt },
    });

    console.log(`Park Manager OTP for ${phoneNumber}: ${otpCode}`);
    return res.json({ message: 'OTP sent successfully', phoneNumber, otp: otpCode });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

export const verifyParkManagerRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'PHONE_VERIFICATION',
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verificationCode) return res.status(400).json({ error: 'Invalid or expired OTP' });

    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    return res.json({ message: 'Phone verified successfully', userId: user.id });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

export const completeParkManagerProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, parkId, email } = req.body;

    if (!firstName || !lastName || !parkId) {
      return res.status(400).json({ error: 'First name, last name, and park required' });
    }

    const park = await prisma.park.findUnique({ where: { id: parkId } });
    if (!park) return res.status(404).json({ error: 'Park not found' });

    let parkManager = await prisma.parkManager.findUnique({ where: { userId } });

    if (parkManager) {
      parkManager = await prisma.parkManager.update({
        where: { id: parkManager.id },
        data: { firstName, lastName, parkId },
      });
    } else {
      parkManager = await prisma.parkManager.create({
        data: { userId, firstName, lastName, parkId, commissionRate: 5 },
      });
    }

    if (email) {
      await prisma.user.update({ where: { id: userId }, data: { email } });
    }

    return res.json({ message: 'Profile completed successfully', parkManager });
  } catch (error) {
    console.error('Complete profile error:', error);
    return res.status(500).json({ error: 'Failed to complete profile' });
  }
};

export const uploadParkManagerDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { documentType, documentUrl } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({ error: 'Document type and URL required' });
    }

    // In production, save to a Document table or storage
    return res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    console.error('Upload document error:', error);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
};

export const submitParkManagerBiometric = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { biometricData } = req.body;

    if (!biometricData) return res.status(400).json({ error: 'Biometric data required' });

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    await prisma.parkManager.update({
      where: { id: parkManager.id },
      data: { biometricData },
    });

    return res.json({ message: 'Registration completed successfully' });
  } catch (error) {
    console.error('Submit biometric error:', error);
    return res.status(500).json({ error: 'Failed to submit biometric' });
  }
};

// ============================================
// PART 2: DASHBOARD & SHIFT MANAGEMENT (4 endpoints)
// ============================================

export const getParkManagerDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRevenue = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'SUCCESS',
        category: 'FARE_PAYMENT',
      },
      _sum: { amount: true },
    });

    const activeDrivers = await prisma.driver.count({
      where: {
        isAvailableToday: true,
        vehicle: { currentParkId: parkManager.parkId },
      },
    });

    const totalDrivers = await prisma.driver.count({
      where: { vehicle: { currentParkId: parkManager.parkId } },
    });

    const totalVehicles = await prisma.vehicle.count({
      where: { currentParkId: parkManager.parkId },
    });

    const todayTrips = await prisma.trip.count({
      where: {
        createdAt: { gte: today },
        vehicle: { currentParkId: parkManager.parkId },
      },
    });

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
      },
      include: {
        user: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    const formattedTransactions = await Promise.all(
      recentTransactions.map(async (transaction) => {
        const trip = await prisma.trip.findFirst({
          where: {
            passengerId: transaction.userId,
            createdAt: {
              gte: new Date(transaction.createdAt.getTime() - 60000),
              lte: new Date(transaction.createdAt.getTime() + 60000),
            },
          },
          include: {
            driver: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            route: {
              select: {
                name: true,
              },
            },
          },
        });

        return {
          time: transaction.createdAt.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          driverName: trip?.driver
            ? `${trip.driver.firstName} ${trip.driver.lastName}`
            : 'N/A',
          route: trip?.route?.name || 'N/A',
          amount: `₦${Number(transaction.amount).toLocaleString()}`,
          paymentStatus: 'Paid',
        };
      })
    );

    return res.json({
      parkManager: {
        id: parkManager.id,
        firstName: parkManager.firstName,
        lastName: parkManager.lastName,
      },
      park: parkManager.park,
      stats: {
        transactionsToday: todayRevenue._sum.amount || 0,
        totalTripsToday: todayTrips,
        activeDrivers,
        totalDrivers,
      },
      recentTransactions: formattedTransactions,
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
};

export const startShift = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { biometricData } = req.body;

    if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    if (parkManager.biometricData !== biometricData) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    // Create shift record (simplified - use a Shift table in production)
    return res.json({
      message: 'Shift started successfully',
      shiftStart: new Date(),
    });
  } catch (error) {
    console.error('Start shift error:', error);
    return res.status(500).json({ error: 'Failed to start shift' });
  }
};

export const endShift = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    return res.json({
      message: 'Shift ended successfully',
      shiftEnd: new Date(),
    });
  } catch (error) {
    console.error('End shift error:', error);
    return res.status(500).json({ error: 'Failed to end shift' });
  }
};

export const getCurrentShift = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    // In production, fetch from Shift table
    return res.json({
      shiftActive: true,
      shiftStart: new Date(),
    });
  } catch (error) {
    console.error('Get current shift error:', error);
    return res.status(500).json({ error: 'Failed to fetch shift' });
  }
};

// ============================================
// PART 3: DRIVER MANAGEMENT (10 endpoints)
// ============================================

export const getAllDrivers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status, page = '1', limit = '20' } = req.query;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      vehicle: { currentParkId: parkManager.parkId },
    };

    if (status === 'active') {
      where.isAvailableToday = true;
    } else if (status === 'inactive') {
      where.isAvailableToday = false;
    }

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: { select: { phoneNumber: true } },
          vehicle: true,
          assignedRoute: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.driver.count({ where }),
    ]);

    return res.json({
      drivers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    return res.status(500).json({ error: 'Failed to fetch drivers' });
  }
};

export const getDriverDetails = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { phoneNumber: true, email: true } },
        vehicle: { include: { park: true } },
        assignedRoute: true,
        trips: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    return res.json({ driver });
  } catch (error) {
    console.error('Get driver details error:', error);
    return res.status(500).json({ error: 'Failed to fetch driver details' });
  }
};

export const activateDriver = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { driverId } = req.params;
    const { biometricData } = req.body;

    if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    if (parkManager.biometricData !== biometricData) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        isAvailableToday: true,
        lastCheckInDate: new Date(),
      },
    });

    return res.json({ message: 'Driver activated successfully' });
  } catch (error) {
    console.error('Activate driver error:', error);
    return res.status(500).json({ error: 'Failed to activate driver' });
  }
};

export const deactivateDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await prisma.driver.update({
      where: { id: driverId },
      data: { isAvailableToday: false },
    });

    return res.json({ message: 'Driver deactivated successfully' });
  } catch (error) {
    console.error('Deactivate driver error:', error);
    return res.status(500).json({ error: 'Failed to deactivate driver' });
  }
};

export const approveDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await prisma.driver.update({
      where: { id: driverId },
      data: { isVerified: true },
    });

    return res.json({ message: 'Driver approved successfully' });
  } catch (error) {
    console.error('Approve driver error:', error);
    return res.status(500).json({ error: 'Failed to approve driver' });
  }
};

export const suspendDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { reason } = req.body;

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    await prisma.driver.update({
      where: { id: driverId },
      data: {
        isVerified: false,
        isAvailableToday: false,
      },
    });

    return res.json({ message: 'Driver suspended successfully', reason });
  } catch (error) {
    console.error('Suspend driver error:', error);
    return res.status(500).json({ error: 'Failed to suspend driver' });
  }
};

export const updateDriverStatus = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    // Map status to database fields
    const updateData: any = {};
    if (status === 'Active') updateData.isAvailableToday = true;
    if (status === 'Inactive') updateData.isAvailableToday = false;

    await prisma.driver.update({
      where: { id: driverId },
      data: updateData,
    });

    return res.json({ message: 'Driver status updated successfully', status });
  } catch (error) {
    console.error('Update driver status error:', error);
    return res.status(500).json({ error: 'Failed to update driver status' });
  }
};

export const getDriverStatistics = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const totalTrips = await prisma.trip.count({
      where: { driverId, status: 'COMPLETED' },
    });

    const totalEarnings = await prisma.transaction.aggregate({
      where: {
        userId: driver.userId,
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    return res.json({
      totalTrips,
      totalEarnings: totalEarnings._sum.amount || 0,
    });
  } catch (error) {
    console.error('Get driver statistics error:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

export const assignDriverToRoute = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { routeId } = req.body;

    if (!routeId) return res.status(400).json({ error: 'Route ID is required' });

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) return res.status(404).json({ error: 'Route not found' });

    await prisma.driver.update({
      where: { id: driverId },
      data: { assignedRouteId: routeId },
    });

    return res.json({ message: 'Route assigned successfully' });
  } catch (error) {
    console.error('Assign driver to route error:', error);
    return res.status(500).json({ error: 'Failed to assign route' });
  }
};

export const getDriversStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const totalDrivers = await prisma.driver.count({
      where: { vehicle: { currentParkId: parkManager.parkId } },
    });

    const activeDrivers = await prisma.driver.count({
      where: {
        isAvailableToday: true,
        vehicle: { currentParkId: parkManager.parkId },
      },
    });

    return res.json({
      totalDrivers,
      activeDrivers,
      inactiveDrivers: totalDrivers - activeDrivers,
    });
  } catch (error) {
    console.error('Get drivers statistics error:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// ============================================
// PART 4: VEHICLE MANAGEMENT (5 endpoints)
// ============================================

export const getAllVehicles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = '1', limit = '20' } = req.query;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where: { currentParkId: parkManager.parkId },
        include: {
          driver: {
            select: {
              firstName: true,
              lastName: true,
              user: { select: { phoneNumber: true } },
            },
          },
          park: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where: { currentParkId: parkManager.parkId } }),
    ]);

    return res.json({
      vehicles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all vehicles error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
};

export const getVehicleDetails = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: {
          include: {
            user: { select: { phoneNumber: true, email: true } },
          },
        },
        park: true,
        trips: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    return res.json({ vehicle });
  } catch (error) {
    console.error('Get vehicle details error:', error);
    return res.status(500).json({ error: 'Failed to fetch vehicle details' });
  }
};

export const approveVehicle = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isVerified: true, isActive: true },
    });

    return res.json({ message: 'Vehicle approved successfully' });
  } catch (error) {
    console.error('Approve vehicle error:', error);
    return res.status(500).json({ error: 'Failed to approve vehicle' });
  }
};

export const deactivateVehicle = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false, isAvailableForBoarding: false },
    });

    return res.json({ message: 'Vehicle deactivated successfully' });
  } catch (error) {
    console.error('Deactivate vehicle error:', error);
    return res.status(500).json({ error: 'Failed to deactivate vehicle' });
  }
};

export const getVehicleStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const totalVehicles = await prisma.vehicle.count({
      where: { currentParkId: parkManager.parkId },
    });

    const activeVehicles = await prisma.vehicle.count({
      where: {
        currentParkId: parkManager.parkId,
        isActive: true,
        isAvailableForBoarding: true,
      },
    });

    return res.json({
      totalVehicles,
      activeVehicles,
      inactiveVehicles: totalVehicles - activeVehicles,
    });
  } catch (error) {
    console.error('Get vehicle statistics error:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// ============================================
// PART 5: PASSENGER MANAGEMENT (3 endpoints)
// ============================================

export const getAllPassengers = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [passengers, total] = await Promise.all([
      prisma.passenger.findMany({
        where,
        include: {
          user: { select: { phoneNumber: true, email: true } },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.passenger.count({ where }),
    ]);

    return res.json({
      passengers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all passengers error:', error);
    return res.status(500).json({ error: 'Failed to fetch passengers' });
  }
};

export const activatePassenger = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { passengerId } = req.params;
    const { biometricData } = req.body;

    if (!biometricData) return res.status(400).json({ error: 'Biometric verification required' });

    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });

    const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
    if (!passenger) return res.status(404).json({ error: 'Passenger not found' });

    // Verify passenger biometric
    if (passenger.biometricData !== biometricData) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    return res.json({ message: 'Passenger checked in successfully' });
  } catch (error) {
    console.error('Activate passenger error:', error);
    return res.status(500).json({ error: 'Failed to activate passenger' });
  }
};

export const getPassengerStatistics = async (req: Request, res: Response) => {
  try {
    const totalPassengers = await prisma.passenger.count();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPassengers = await prisma.passenger.count({
      where: { createdAt: { gte: today } },
    });

    return res.json({
      totalPassengers,
      todayPassengers,
    });
  } catch (error) {
    console.error('Get passenger statistics error:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// ============================================
// PART 6: WALLET & TRANSACTIONS (5 endpoints)
// ============================================

export const getWallet = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
  
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });
  
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      // Calculate park commission from transactions
      const parkRevenue = await prisma.transaction.aggregate({
        where: {
          category: 'FARE_PAYMENT',
          status: 'SUCCESS',
        },
        _sum: { amount: true },
      });
  
      const commissionRate = parkManager.commissionRate || 5;
      const parkCommission = (Number(parkRevenue._sum.amount || 0) * Number(commissionRate)) / 100;
  
      return res.json({
        balance: parkCommission,
        commissionRate,
        parkName: parkManager.park?.name,
      });
    } catch (error) {
      console.error('Get wallet error:', error);
      return res.status(500).json({ error: 'Failed to fetch wallet' });
    }
  };
  
  export const getTransactions = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { page = '1', limit = '20', category, status, startDate, endDate } = req.query;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;
  
      const where: any = {};
      if (category) where.category = category;
      if (status) where.status = status;
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
  
      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          include: {
            user: { select: { phoneNumber: true } },
          },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transaction.count({ where }),
      ]);
  
      return res.json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  };
  
  export const getPendingSettlements = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      // Get all completed trips that haven't been settled
      const completedTrips = await prisma.trip.findMany({
        where: {
          status: 'COMPLETED',
          vehicle: { currentParkId: parkManager.parkId },
        },
        include: {
          driver: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          route: true,
        },
      });
  
      const totalFares = completedTrips.reduce((sum, trip) => sum + Number(trip.fare), 0);
  
      // Calculate commission
      const commissionRate = parkManager.commissionRate || 5;
      const parkCommission = (totalFares * Number(commissionRate)) / 100;
      const driverPayout = totalFares - parkCommission;
  
      // Group by driver
      const driverSettlements = completedTrips.reduce((acc: any, trip) => {
        const driverId = trip.driverId;
        if (!acc[driverId]) {
          acc[driverId] = {
            driver: trip.driver,
            trips: [],
            totalFare: 0,
          };
        }
        acc[driverId].trips.push(trip);
        acc[driverId].totalFare += Number(trip.fare);
        return acc;
      }, {});
  
      return res.json({
        totalFares,
        parkCommission,
        driverPayout,
        driverSettlements: Object.values(driverSettlements),
      });
    } catch (error) {
      console.error('Get pending settlements error:', error);
      return res.status(500).json({ error: 'Failed to fetch pending settlements' });
    }
  };
  
  export const withdrawFunds = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { amount, bankAccountId, pin } = req.body;
  
      if (!amount || !pin) {
        return res.status(400).json({ error: 'Amount and PIN are required' });
      }
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      if (!parkManager.transactionPin) {
        return res.status(400).json({ error: 'Please set up your transaction PIN first' });
      }
  
      const isPinValid = await bcrypt.compare(pin, parkManager.transactionPin);
      if (!isPinValid) return res.status(401).json({ error: 'Invalid PIN' });
  
      // TODO: Process withdrawal to bank account
      // Create transaction record
  
      return res.json({
        message: 'Withdrawal successful',
        reference: `WD-${Date.now()}`,
      });
    } catch (error) {
      console.error('Withdraw funds error:', error);
      return res.status(500).json({ error: 'Withdrawal failed' });
    }
  };
  
  // ============================================
  // PART 7: REPORTS (3 endpoints)
  // ============================================
  
  export const getRevenueReport = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, groupBy = 'day' } = req.query;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      const where: any = {
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
        vehicle: { currentParkId: parkManager.parkId },
      };
  
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
  
      const transactions = await prisma.transaction.findMany({
        where,
        select: {
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
  
      const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
      return res.json({
        totalRevenue,
        transactionCount: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error('Get revenue report error:', error);
      return res.status(500).json({ error: 'Failed to fetch revenue report' });
    }
  };
  
  export const getTripReport = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { startDate, endDate } = req.query;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      const where: any = {
        vehicle: { currentParkId: parkManager.parkId },
      };
  
      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
  
      const [totalTrips, completedTrips, cancelledTrips] = await Promise.all([
        prisma.trip.count({ where }),
        prisma.trip.count({ where: { ...where, status: 'COMPLETED' } }),
        prisma.trip.count({ where: { ...where, status: 'CANCELLED' } }),
      ]);
  
      return res.json({
        totalTrips,
        completedTrips,
        cancelledTrips,
        inProgressTrips: totalTrips - completedTrips - cancelledTrips,
      });
    } catch (error) {
      console.error('Get trip report error:', error);
      return res.status(500).json({ error: 'Failed to fetch trip report' });
    }
  };
  
  export const getDriverPerformanceReport = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { startDate, endDate, limit = '10' } = req.query;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      // Get all drivers at this park
      const drivers = await prisma.driver.findMany({
        where: {
          vehicle: { currentParkId: parkManager.parkId },
        },
        include: {
          trips: {
            where: {
              status: 'COMPLETED',
              ...(startDate && endDate
                ? {
                    createdAt: {
                      gte: new Date(startDate as string),
                      lte: new Date(endDate as string),
                    },
                  }
                : {}),
            },
          },
        },
        take: parseInt(limit as string),
      });
  
      const performance = drivers.map((driver) => ({
        driverId: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        totalTrips: driver.trips.length,
        totalRevenue: driver.trips.reduce((sum, trip) => sum + Number(trip.fare), 0),
      }));
  
      // Sort by total revenue
      performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  
      return res.json({ performance });
    } catch (error) {
      console.error('Get driver performance report error:', error);
      return res.status(500).json({ error: 'Failed to fetch driver performance report' });
    }
  };
  
  // ============================================
  // PART 8: SETTINGS (2 endpoints)
  // ============================================
  
  export const getParkDetails = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
  
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
        include: { park: true },
      });
  
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      return res.json({
        park: parkManager.park,
        commissionRate: parkManager.commissionRate,
      });
    } catch (error) {
      console.error('Get park details error:', error);
      return res.status(500).json({ error: 'Failed to fetch park details' });
    }
  };
  
  export const updateParkSettings = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { commissionRate } = req.body;
  
      const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
      if (!parkManager) return res.status(404).json({ error: 'Park Manager not found' });
  
      if (commissionRate !== undefined) {
        await prisma.parkManager.update({
          where: { id: parkManager.id },
          data: { commissionRate: Number(commissionRate) },
        });
      }
  
      return res.json({
        message: 'Settings updated successfully',
        commissionRate,
      });
    } catch (error) {
      console.error('Update park settings error:', error);
      return res.status(500).json({ error: 'Failed to update settings' });
    }
  };

  export const getParksList = async (req: Request, res: Response) => {
    try {
      const parks = await prisma.park.findMany({
        select: {
          id: true,
          name: true,
          address: true, 
        },
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
  
      // Format the response to include location field for frontend
      const formattedParks = parks.map(park => ({
        id: park.id,
        name: park.name,
        location: park.address,  // Map address to location for consistency
      }));
  
      return res.json({
        parks: formattedParks,
      });
    } catch (error) {
      console.error('Get parks list error:', error);
      return res.status(500).json({ error: 'Failed to fetch parks list' });
    }
  };

  export const getAvailableVehicles = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { destination } = req.query;
  
      if (!destination) {
        return res.status(400).json({ error: 'Destination is required' });
      }
  
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
      });
  
      if (!parkManager) {
        return res.status(404).json({ error: 'Park Manager not found' });
      }
  
      // Get all active trips for this destination
      const activeTrips = await prisma.trip.findMany({
        where: {
          status: 'PENDING',
          route: {
            destination: destination as string,
          },
        },
        include: {
          vehicle: {
            include: {
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          route: {
            select: {
              id: true,
              name: true,
              destination: true,
            },
          },
        },
      });
  
      // Filter trips for vehicles at this park that are available
      const formattedVehicles = activeTrips
        .filter((trip) => {
          return (
            trip.vehicle.currentParkId === parkManager.parkId &&
            trip.vehicle.isActive &&
            trip.vehicle.isAvailableForBoarding
          );
        })
        .map((trip) => {
          const passengerCount = 0; // Will calculate when TripPassenger table exists
  
          return {
            id: trip.vehicle.id,
            plateNumber: trip.vehicle.plateNumber,
            capacity: trip.vehicle.capacity,
            currentPassengers: passengerCount,
            availableSeats: trip.vehicle.capacity - passengerCount,
            driver: trip.vehicle.driver,
            route: trip.route,
          };
        });
  
      return res.json({
        vehicles: formattedVehicles,
      });
    } catch (error) {
      console.error('Get available vehicles error:', error);
      return res.status(500).json({ error: 'Failed to fetch available vehicles' });
    }
  };

  export const checkPassengerWallet = async (req: Request, res: Response) => {
    try {
      const { passengerId, biometricData } = req.body;
  
      if (!passengerId || !biometricData) {
        return res.status(400).json({ 
          error: 'Passenger ID and biometric data are required' 
        });
      }
  
      // Get passenger
      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          walletBalance: true,
          biometricData: true,
        },
      });
  
      if (!passenger) {
        return res.status(404).json({ error: 'Passenger not found' });
      }
  
      // TODO: Verify biometric data matches passenger
      // For now, we'll skip biometric verification
      // if (passenger.biometricData !== biometricData) {
      //   return res.status(401).json({ error: 'Biometric verification failed' });
      // }
  
      // Get wallet balance
      const balance = passenger.walletBalance || 0;
  
      // Get fare (for now, use a default fare - will be dynamic later)
      const fareRequired = 250; // Default fare - will come from route/trip later
  
      return res.json({
        success: true,
        balance: Number(balance),
        fareRequired,
        canPay: Number(balance) >= fareRequired,
        passenger: {
          id: passenger.id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
        },
      });
    } catch (error) {
      console.error('Check passenger wallet error:', error);
      return res.status(500).json({ error: 'Failed to check wallet balance' });
    }
  };

  export const fundWalletWithCash = async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { passengerId, amount } = req.body;
  
      if (!passengerId || !amount) {
        return res.status(400).json({ 
          error: 'Passenger ID and amount are required' 
        });
      }
  
      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }
  
      const parkManager = await prisma.parkManager.findUnique({
        where: { userId },
      });
  
      if (!parkManager) {
        return res.status(404).json({ error: 'Park Manager not found' });
      }
  
      // Get passenger
      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
      });
  
      if (!passenger) {
        return res.status(404).json({ error: 'Passenger not found' });
      }
  
      const previousBalance = Number(passenger.walletBalance);
  
      // Create transaction and update wallet in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create transaction record
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: 'CREDIT',
            category: 'WALLET_TOPUP',
            status: 'SUCCESS',
            amount: amount,
            description: `Cash deposit by Park Manager`,
            reference: `CASH-${Date.now()}`,
            userType: 'PASSENGER',  // Added
            balanceBefore: previousBalance,  // Added
            balanceAfter: previousBalance + amount,  // Added
            user: {
              connect: { id: passengerId }
            }
          },
        });
        // Update passenger wallet balance
        const updatedPassenger = await tx.passenger.update({
          where: { id: passengerId },
          data: {
            walletBalance: {
              increment: amount,
            },
          },
        });
  
        return { transaction, updatedPassenger };
      });
  
      return res.json({
        success: true,
        previousBalance,
        amountAdded: amount,
        newBalance: Number(result.updatedPassenger.walletBalance),
        transactionId: result.transaction.id,
      });
    } catch (error) {
      console.error('Fund wallet with cash error:', error);
      return res.status(500).json({ error: 'Failed to fund wallet' });
    }
  };

  export const passengerCheckInAndPay = async (req: Request, res: Response) => {
    try {
      const { passengerId, tripId, vehicleId, biometricData } = req.body;
  
      if (!passengerId || !tripId || !vehicleId || !biometricData) {
        return res.status(400).json({ 
          error: 'Passenger ID, trip ID, vehicle ID, and biometric data are required' 
        });
      }
  
      // Get passenger
      const passenger = await prisma.passenger.findUnique({
        where: { id: passengerId },
      });
  
      if (!passenger) {
        return res.status(404).json({ error: 'Passenger not found' });
      }
  
      // TODO: Verify biometric data
      // if (passenger.biometricData !== biometricData) {
      //   return res.status(401).json({ error: 'Biometric verification failed' });
      // }
  
      // Get trip details to calculate fare
      const trip = await prisma.trip.findUnique({
        where: { id: tripId },
        include: {
          route: true,
        },
      });
  
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' });
      }
  
      // Get fare from route (baseFare, not fare)
      const fare = Number(trip.route.baseFare) || 250;
  
      // Check if passenger has enough balance
      const currentBalance = Number(passenger.walletBalance);
      if (currentBalance < fare) {
        return res.status(400).json({ 
          error: 'Insufficient balance',
          balance: currentBalance,
          fareRequired: fare,
        });
      }
  
      const previousBalance = currentBalance;
  
      // Process payment and check-in in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            type: 'DEBIT',
            category: 'FARE_PAYMENT',
            status: 'SUCCESS',
            amount: fare,
            description: `Fare payment for trip ${trip.route.name}`,
            reference: `FARE-${Date.now()}`,
            userType: 'PASSENGER',
            balanceBefore: previousBalance,
            balanceAfter: previousBalance - fare,
            user: {
              connect: { id: passengerId }
            }
          },
        });
  
        // Deduct fare from passenger wallet
        const updatedPassenger = await tx.passenger.update({
          where: { id: passengerId },
          data: {
            walletBalance: {
              decrement: fare,
            },
          },
        });
  
        // Create TripPassenger record (check-in)
        const tripPassengerRecord = await tx.tripPassenger.create({
          data: {
            tripId,
            passengerId,
            vehicleId,
            isPaid: true,
            checkInTime: new Date(),
            hasFilledDetails: false,
          },
        });
  
        // Count total passengers for this trip
        const passengerCount = await tx.tripPassenger.count({
          where: { tripId },
        });
  
        return { transaction, updatedPassenger, tripPassengerRecord, passengerCount };
      });
  
      return res.json({
        success: true,
        message: 'Payment successful. Please fill passenger details.',
        transactionId: result.transaction.id,
        amountDeducted: fare,
        newBalance: Number(result.updatedPassenger.walletBalance),
        nextOfKinFormRequired: true,
        currentPassengerCount: result.passengerCount,
        passenger: {
          id: passenger.id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
        },
      });
    } catch (error) {
      console.error('Passenger check-in and payment error:', error);
      return res.status(500).json({ error: 'Failed to process check-in and payment' });
    }
  };

  export const savePassengerDetails = async (req: Request, res: Response) => {
  try {
    const { passengerId, tripId, nextOfKinName, nextOfKinPhone, relationship } = req.body;

    if (!passengerId || !tripId || !nextOfKinName || !nextOfKinPhone || !relationship) {
      return res.status(400).json({ 
        error: 'All fields are required (passengerId, tripId, nextOfKinName, nextOfKinPhone, relationship)' 
      });
    }

    // Verify passenger is checked in for this trip
    const tripPassenger = await prisma.tripPassenger.findFirst({
      where: {
        tripId,
        passengerId,
      },
    });

    if (!tripPassenger) {
      return res.status(404).json({ 
        error: 'Passenger not checked in for this trip' 
      });
    }

    if (tripPassenger.hasFilledDetails) {
      return res.status(400).json({ 
        error: 'Passenger details already submitted for this trip' 
      });
    }

    // Save passenger details and update tripPassenger in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create passenger details record
      const passengerDetails = await tx.passengerDetails.create({
        data: {
          tripId,
          passengerId,
          nextOfKinName,
          nextOfKinPhone,
          relationship,
        },
      });

      // Update tripPassenger to mark details as filled
      await tx.tripPassenger.update({
        where: { id: tripPassenger.id },
        data: {
          hasFilledDetails: true,
        },
      });

      return passengerDetails;
    });

    return res.json({
      success: true,
      message: 'Passenger details saved successfully. Passenger can now board.',
      passengerDetailsId: result.id,
    });
  } catch (error) {
    console.error('Save passenger details error:', error);
    return res.status(500).json({ error: 'Failed to save passenger details' });
  }
};

export const getTripPassengers = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        route: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get all passengers for this trip
    const tripPassengers = await prisma.tripPassenger.findMany({
      where: { 
        tripId,
        isPaid: true,
      },
      include: {
        passenger: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Get passenger details for each passenger
    const passengersWithDetails = await Promise.all(
      tripPassengers.map(async (tp) => {
        const details = await prisma.passengerDetails.findFirst({
          where: {
            tripId,
            passengerId: tp.passengerId,
          },
        });

        return {
          name: `${tp.passenger.firstName} ${tp.passenger.lastName}`,
          destination: trip.route.destination,
          nextOfKinName: details?.nextOfKinName || 'N/A',
          nextOfKinPhone: details?.nextOfKinPhone || 'N/A',
          relationship: details?.relationship || 'N/A',
          checkInTime: tp.checkInTime
            ? tp.checkInTime.toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'N/A',
          amountPaid: `₦${Number(trip.route.baseFare).toLocaleString()}`,
        };
      })
    );

    const passengerCount = tripPassengers.length;
    const capacity = trip.vehicle.capacity;

    return res.json({
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      passengerCount,
      capacity,
      isFull: passengerCount >= capacity,
      passengers: passengersWithDetails,
    });
  } catch (error) {
    console.error('Get trip passengers error:', error);
    return res.status(500).json({ error: 'Failed to fetch trip passengers' });
  }
};

export const getSettlementPreview = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        route: true,
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Count passengers who have paid
    const passengerCount = await prisma.tripPassenger.count({
      where: {
        tripId,
        isPaid: true,
      },
    });

    // Calculate total fares collected
    const farePerPassenger = Number(trip.route.baseFare);
    const totalFares = passengerCount * farePerPassenger;

    // Get commission rates (using defaults for now - can be from parkManager settings later)
    const driverPercentage = 95;
    const parkPercentage = 5;
    const tyapPercentage = 2;

    // Calculate breakdown
    const driverPayout = (totalFares * driverPercentage) / 100;
    const parkCommission = (totalFares * parkPercentage) / 100;
    const tyapServiceCharge = (totalFares * tyapPercentage) / 100;

    // Check if vehicle is full (can approve settlement)
    const canApprove = passengerCount >= trip.vehicle.capacity;

    return res.json({
      tripId: trip.id,
      vehicleId: trip.vehicleId,
      passengerCount,
      totalFares,
      breakdown: {
        driverPayout,
        driverPayoutPercentage: driverPercentage,
        parkCommission,
        parkCommissionPercentage: parkPercentage,
        tyapServiceCharge,
        tyapServiceChargePercentage: tyapPercentage,
      },
      driver: trip.driver,
      canApprove,
    });
  } catch (error) {
    console.error('Get settlement preview error:', error);
    return res.status(500).json({ error: 'Failed to fetch settlement preview' });
  }
};

export const approveSettlement = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { pin, biometricData } = req.body;
    const userId = req.user?.id;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Verify PIN (simple comparison for now - enhance with bcrypt later)
    if (parkManager.transactionPin !== pin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // TODO: Verify biometric if provided
    // if (biometricData && parkManager.biometricData !== biometricData) {
    //   return res.status(401).json({ error: 'Biometric verification failed' });
    // }

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        route: true,
        driver: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Check if settlement already exists
    const existingSettlement = await prisma.settlement.findUnique({
      where: { tripId },
    });

    if (existingSettlement && existingSettlement.status === 'APPROVED') {
      return res.status(400).json({ error: 'Settlement already approved for this trip' });
    }

    // Count passengers
    const passengerCount = await prisma.tripPassenger.count({
      where: { tripId, isPaid: true },
    });

    if (passengerCount < trip.vehicle.capacity) {
      return res.status(400).json({ 
        error: 'Vehicle not full. Cannot approve settlement.',
        currentPassengers: passengerCount,
        capacity: trip.vehicle.capacity,
      });
    }

    // Calculate settlement amounts
    const farePerPassenger = Number(trip.route.baseFare);
    const totalFares = passengerCount * farePerPassenger;

    const driverPercentage = 95;
    const parkPercentage = 5;
    const tyapPercentage = 2;

    const driverPayout = (totalFares * driverPercentage) / 100;
    const parkCommission = (totalFares * parkPercentage) / 100;
    const tyapFee = (totalFares * tyapPercentage) / 100;

    // Process settlement and distribute funds
    const result = await prisma.$transaction(async (tx) => {
      // Create settlement record
      const settlement = await tx.settlement.create({
        data: {
          tripId,
          totalAmount: totalFares,
          driverPayout,
          parkCommission,
          tyapFee,
          status: 'APPROVED',
          approvedBy: parkManager.id,
          approvedAt: new Date(),
        },
      });

      // Get current wallet balances from User table
      const driverUser = await tx.user.findUnique({
        where: { id: trip.driver.userId },
      });

      const parkManagerUser = await tx.user.findUnique({
        where: { id: parkManager.userId },
      });

      const driverBalanceBefore = Number(driverUser?.walletBalance || 0);
      const parkManagerBalanceBefore = Number(parkManagerUser?.walletBalance || 0);

      // 1. Credit Driver Wallet
      await tx.transaction.create({
        data: {
          type: 'CREDIT',
          category: 'COMMISSION',
          status: 'SUCCESS',
          amount: driverPayout,
          description: `Driver payout for trip ${trip.route.name}`,
          reference: `SETTLEMENT-DRIVER-${Date.now()}`,
          userType: 'DRIVER',
          balanceBefore: driverBalanceBefore,
          balanceAfter: driverBalanceBefore + driverPayout,
          user: {
            connect: { id: trip.driver.userId }
          }
        },
      });

      await tx.user.update({
        where: { id: trip.driver.userId },
        data: {
          walletBalance: {
            increment: driverPayout,
          },
        },
      });

      // 2. Credit Park Manager Wallet
      await tx.transaction.create({
        data: {
          type: 'CREDIT',
          category: 'COMMISSION',
          status: 'SUCCESS',
          amount: parkCommission,
          description: `Park commission for trip ${trip.route.name}`,
          reference: `SETTLEMENT-PARK-${Date.now()}`,
          userType: 'PARK_MANAGER',
          balanceBefore: parkManagerBalanceBefore,
          balanceAfter: parkManagerBalanceBefore + parkCommission,
          user: {
            connect: { id: parkManager.userId }
          }
        },
      });

      await tx.user.update({
        where: { id: parkManager.userId },
        data: {
          walletBalance: {
            increment: parkCommission,
          },
        },
      });

      // 3. T-YAP Fee Transaction (just record it)
      await tx.transaction.create({
        data: {
          type: 'CREDIT',
          category: 'COMMISSION',
          status: 'SUCCESS',
          amount: tyapFee,
          description: `T-YAP service fee for trip ${trip.route.name}`,
          reference: `SETTLEMENT-TYAP-${Date.now()}`,
          userType: 'PARK_MANAGER', // Using existing type since ADMIN doesn't exist
          balanceBefore: 0,
          balanceAfter: tyapFee,
          user: {
            connect: { id: parkManager.userId } // Placeholder for now
          }
        },
      });

      // Get updated balances
      const updatedDriverUser = await tx.user.findUnique({
        where: { id: trip.driver.userId },
      });

      const updatedParkManagerUser = await tx.user.findUnique({
        where: { id: parkManager.userId },
      });

      return {
        settlement,
        driverWalletBalance: Number(updatedDriverUser?.walletBalance || 0),
        parkManagerWalletBalance: Number(updatedParkManagerUser?.walletBalance || 0),
      };
    });

    return res.json({
      success: true,
      message: 'Settlement approved successfully. Driver can now start trip.',
      settlementId: result.settlement.id,
      timestamp: result.settlement.approvedAt,
      distribution: {
        driver: {
          amount: driverPayout,
          walletBalance: result.driverWalletBalance,
        },
        parkManager: {
          amount: parkCommission,
          walletBalance: result.parkManagerWalletBalance,
        },
        tyap: {
          amount: tyapFee,
        },
      },
    });
  } catch (error) {
    console.error('Approve settlement error:', error);
    return res.status(500).json({ error: 'Failed to approve settlement' });
  }
};

export const getTransactionFilterOptions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Get all drivers at this park
    const drivers = await prisma.driver.findMany({
      where: {
        vehicle: {
          currentParkId: parkManager.parkId,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const formattedDrivers = drivers.map(driver => ({
      id: driver.id,
      name: `${driver.firstName} ${driver.lastName}`,
    }));

    // Get all routes serving this park
    const routes = await prisma.route.findMany({
      where: {
        OR: [
          { originParkId: parkManager.parkId },
          { destinationParkId: parkManager.parkId },
        ],
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Static time range options
    const timeRanges = [
      { value: 'today', label: 'Today' },
      { value: 'yesterday', label: 'Yesterday' },
      { value: 'last7days', label: 'Last 7 Days' },
      { value: 'last30days', label: 'Last 30 Days' },
      { value: 'custom', label: 'Custom Range' },
    ];

    return res.json({
      drivers: formattedDrivers,
      routes,
      timeRanges,
    });
  } catch (error) {
    console.error('Get transaction filter options error:', error);
    return res.status(500).json({ error: 'Failed to fetch filter options' });
  }
};

export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Get bank accounts through the user relationship
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json({
      bankAccounts,
    });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    return res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
};

export const addBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accountName, accountNumber, bankName, bankCode, isDefault } = req.body;

    if (!accountName || !accountNumber || !bankName || !bankCode) {
      return res.status(400).json({ 
        error: 'All fields are required (accountName, accountNumber, bankName, bankCode)' 
      });
    }

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // If setting as default, unset all other defaults
    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        userId,
        accountName,
        accountNumber,
        bankName,
        bankCode,
        isDefault: isDefault || false,
      },
    });

    return res.json({
      success: true,
      message: 'Bank account added successfully',
      bankAccount,
    });
  } catch (error) {
    console.error('Add bank account error:', error);
    return res.status(500).json({ error: 'Failed to add bank account' });
  }
};

export const deleteBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Verify bank account belongs to this user
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    if (bankAccount.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if this is the only account
    const accountCount = await prisma.bankAccount.count({
      where: { userId },
    });

    if (accountCount === 1) {
      return res.status(400).json({ 
        error: 'Cannot delete the only bank account. Add another account first.' 
      });
    }

    // If deleting default account, set another as default
    if (bankAccount.isDefault) {
      const firstOtherAccount = await prisma.bankAccount.findFirst({
        where: {
          userId,
          id: { not: id },
        },
      });

      if (firstOtherAccount) {
        await prisma.bankAccount.update({
          where: { id: firstOtherAccount.id },
          data: { isDefault: true },
        });
      }
    }

    // Delete the account
    await prisma.bankAccount.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: 'Bank account removed successfully',
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    return res.status(500).json({ error: 'Failed to delete bank account' });
  }
};

export const getDeviceStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    // Mock device status for now - actual device integration later
    return res.json({
      deviceId: 'AG-001',
      status: 'online',
      lastSync: new Date().toISOString(),
      batteryLevel: 85,
      networkStatus: 'wifi',
      biometricScannerStatus: 'connected',
    });
  } catch (error) {
    console.error('Get device status error:', error);
    return res.status(500).json({ error: 'Failed to fetch device status' });
  }
};

export const contactSupport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subject, message, priority, category } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Subject and message are required' 
      });
    }

    const parkManager = await prisma.parkManager.findUnique({
      where: { userId },
    });

    if (!parkManager) {
      return res.status(404).json({ error: 'Park Manager not found' });
    }

    const supportTicket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        message,
        priority: priority || 'NORMAL',
        category: category || 'TECHNICAL', // Adjust based on your enum
        status: 'OPEN',
      },
    });

    // TODO: Send email notification to support team
    // await sendSupportEmail(supportTicket);

    return res.json({
      success: true,
      message: 'Support ticket created successfully',
      ticketId: supportTicket.id,
      estimatedResponse: 'Within 24 hours',
    });
  } catch (error) {
    console.error('Contact support error:', error);
    return res.status(500).json({ error: 'Failed to create support ticket' });
  }
};