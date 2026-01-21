import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// DASHBOARD / HOME
// ============================================

/**
 * Get Driver Dashboard
 * GET /api/driver/dashboard
 */
export const getDriverDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // Get driver with related data
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true,
            walletBalance: true,
          },
        },
        vehicle: {
          include: {
            park: true,
          },
        },
        assignedRoute: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        category: 'FARE_PAYMENT',
        status: 'SUCCESS',
        createdAt: { gte: today },
      },
    });

    const todayEarnings = todayTransactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    // Get recent transactions (last 10)
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        trip: true,
      },
    });

    // Get active trip (if any)
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        route: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return res.json({
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        licenseNumber: driver.licenseNumber,
        isVerified: driver.isVerified,
        isAvailableToday: driver.isAvailableToday,
        tier: driver.tier,
        profilePicture: driver.profilePicture,
      },
      wallet: {
        balance: driver.walletBalance,
        availableBalance: driver.user.walletBalance,
      },
      currentPark: driver.vehicle?.park || null,
      assignedRoute: driver.assignedRoute,
      todayEarnings,
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        category: t.category,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
        trip: t.trip,
      })),
      activeTrip,
    });
  } catch (error) {
    console.error('Get driver dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// ============================================
// CHECK-IN / AVAILABILITY
// ============================================

/**
 * Driver Check-In (Mark Available Today)
 * POST /api/driver/check-in
 */
export const checkIn = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Update driver availability
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        isAvailableToday: true,
        lastCheckInDate: new Date(),
      },
    });

    return res.json({
      message: 'Check-in successful',
      driver: {
        id: updatedDriver.id,
        isAvailableToday: updatedDriver.isAvailableToday,
        lastCheckInDate: updatedDriver.lastCheckInDate,
      },
    });
  } catch (error) {
    console.error('Driver check-in error:', error);
    return res.status(500).json({ error: 'Check-in failed' });
  }
};

/**
 * Driver Check-Out (Mark Unavailable)
 * POST /api/driver/check-out
 */
export const checkOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check if driver has active trips
    const activeTrip = await prisma.trip.findFirst({
      where: {
        driverId: driver.id,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
      },
    });

    if (activeTrip) {
      return res.status(400).json({
        error: 'Cannot check out while you have active trips',
      });
    }

    // Update driver availability
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        isAvailableToday: false,
      },
    });

    return res.json({
      message: 'Check-out successful',
      driver: {
        id: updatedDriver.id,
        isAvailableToday: updatedDriver.isAvailableToday,
      },
    });
  } catch (error) {
    console.error('Driver check-out error:', error);
    return res.status(500).json({ error: 'Check-out failed' });
  }
};

// ============================================
// TRIP MANAGEMENT
// ============================================

/**
 * Start Trip
 * POST /api/driver/trips/start
 */
export const startTrip = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { routeId, passengerId, fare } = req.body;

    // Validation
    if (!routeId || !passengerId || !fare) {
      return res.status(400).json({
        error: 'Route ID, Passenger ID, and fare are required',
      });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { vehicle: true },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (!driver.vehicle) {
      return res.status(400).json({ error: 'No vehicle assigned to driver' });
    }

    if (!driver.isAvailableToday) {
      return res.status(400).json({
        error: 'Please check in before starting a trip',
      });
    }

    // Check if passenger exists
    const passenger = await prisma.user.findUnique({
      where: { id: passengerId },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    // Check if route exists
    const route = await prisma.route.findUnique({
      where: { id: routeId },
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Create trip
    const trip = await prisma.trip.create({
      data: {
        routeId,
        driverId: driver.id,
        vehicleId: driver.vehicle.id,
        passengerId,
        fare: Number(fare),
        status: 'IN_PROGRESS',
        departureTime: new Date(),
      },
      include: {
        route: true,
        vehicle: true,
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    return res.status(201).json({
      message: 'Trip started successfully',
      trip,
    });
  } catch (error) {
    console.error('Start trip error:', error);
    return res.status(500).json({ error: 'Failed to start trip' });
  }
};

/**
 * Complete Trip
 * POST /api/driver/trips/:tripId/complete
 */
export const completeTrip = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { tripId } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.driverId !== driver.id) {
      return res.status(403).json({ error: 'This is not your trip' });
    }

    if (trip.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Trip already completed' });
    }

    // Update trip
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'COMPLETED',
        arrivalTime: new Date(),
      },
    });

    // Create transaction for fare payment
    const transaction = await prisma.transaction.create({
      data: {
        userId: driver.userId,
        userType: 'DRIVER',
        type: 'CREDIT',
        category: 'FARE_PAYMENT',
        amount: trip.fare,
        balanceBefore: driver.walletBalance,
        balanceAfter: driver.walletBalance.add(trip.fare),
        status: 'SUCCESS',
        reference: `FARE-${Date.now()}`,
        description: `Fare payment for trip ${tripId}`,
        tripId: trip.id,
      },
    });

    // Update driver wallet
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        walletBalance: {
          increment: trip.fare,
        },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: driver.userId },
      data: {
        walletBalance: {
          increment: Number(trip.fare),
        },
      },
    });

    return res.json({
      message: 'Trip completed successfully',
      trip: updatedTrip,
      transaction,
    });
  } catch (error) {
    console.error('Complete trip error:', error);
    return res.status(500).json({ error: 'Failed to complete trip' });
  }
};

/**
 * Get Passenger Checklist (Passengers waiting at park)
 * GET /api/driver/passengers/checklist
 */
export const getPassengerChecklist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        vehicle: true,
        assignedRoute: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get pending trips for this driver's route
    const pendingTrips = await prisma.trip.findMany({
      where: {
        routeId: driver.assignedRouteId || undefined,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        route: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return res.json({
      passengers: pendingTrips.map((trip) => ({
        tripId: trip.id,
        passenger: trip.user,
        route: trip.route,
        fare: trip.fare,
        createdAt: trip.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get passenger checklist error:', error);
    return res.status(500).json({ error: 'Failed to fetch passenger checklist' });
  }
};

// ============================================
// TRANSACTIONS
// ============================================

/**
 * Get All Driver Transactions
 * GET /api/driver/transactions
 */
export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = '1', limit = '20', search, category, status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { userId };

    if (search) {
      where.description = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          trip: true,
        },
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

// ============================================
// WALLET & BANK ACCOUNTS
// ============================================

/**
 * Get Wallet Details
 * GET /api/driver/wallet
 */
export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return res.json({
      balance: driver.walletBalance,
      availableBalance: driver.user.walletBalance,
      recentTransactions,
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet details' });
  }
};

/**
 * Add Bank Account
 * POST /api/driver/bank-accounts
 */
export const addBankAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { accountName, accountNumber, bankName, bankCode, accountType, isDefault } = req.body;

    // Validation
    if (!accountName || !accountNumber || !bankName) {
      return res.status(400).json({
        error: 'Account name, account number, and bank name are required',
      });
    }

    // If setting as default, unset other defaults
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
        bankCode: bankCode || null,
        accountType: accountType || 'SAVINGS',
        isDefault: isDefault || false,
        isVerified: false,
      },
    });

    return res.status(201).json({
      message: 'Bank account added successfully',
      bankAccount,
    });
  } catch (error) {
    console.error('Add bank account error:', error);
    return res.status(500).json({ error: 'Failed to add bank account' });
  }
};

/**
 * Get All Bank Accounts
 * GET /api/driver/bank-accounts
 */
export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ bankAccounts });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    return res.status(500).json({ error: 'Failed to fetch bank accounts' });
  }
};

/**
 * Withdraw Funds
 * POST /api/driver/withdraw
 */
export const withdrawFunds = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, bankAccountId, pin } = req.body;

    // Validation
    if (!amount || !bankAccountId || !pin) {
      return res.status(400).json({
        error: 'Amount, bank account, and PIN are required',
      });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Verify PIN
    if (!driver.transactionPin) {
      return res.status(400).json({ error: 'Please set up your transaction PIN first' });
    }

    const isPinValid = await bcrypt.compare(pin, driver.transactionPin);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    // Check if sufficient balance
    if (driver.walletBalance.lt(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check if bank account exists
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    // Create withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        userType: 'DRIVER',
        type: 'DEBIT',
        category: 'TRANSFER',
        amount: Number(amount),
        balanceBefore: driver.walletBalance,
        balanceAfter: driver.walletBalance.sub(amount),
        status: 'PROCESSING',
        reference: `WD-${Date.now()}`,
        description: `Withdrawal to ${bankAccount.bankName} (${bankAccount.accountNumber})`,
        metadata: {
          bankAccountId,
          accountNumber: bankAccount.accountNumber,
          bankName: bankAccount.bankName,
        },
      },
    });

    // Update driver wallet
    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        walletBalance: {
          decrement: amount,
        },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: {
          decrement: Number(amount),
        },
      },
    });

    // TODO: Integrate with payment provider for actual withdrawal
    // For now, mark as success
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: 'SUCCESS' },
    });

    return res.json({
      message: 'Withdrawal successful',
      transaction,
    });
  } catch (error) {
    console.error('Withdraw funds error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
};

// ============================================
// TRANSACTION PIN
// ============================================

/**
 * Set Transaction PIN
 * POST /api/driver/set-pin
 */
export const setTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pin, confirmPin } = req.body;

    // Validation
    if (!pin || !confirmPin) {
      return res.status(400).json({ error: 'PIN and confirmation are required' });
    }

    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'PINs do not match' });
    }

    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4 digits' });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Update driver PIN
    await prisma.driver.update({
      where: { id: driver.id },
      data: { transactionPin: hashedPin },
    });

    return res.json({ message: 'Transaction PIN set successfully' });
  } catch (error) {
    console.error('Set PIN error:', error);
    return res.status(500).json({ error: 'Failed to set PIN' });
  }
};

/**
 * Verify Transaction PIN
 * POST /api/driver/verify-pin
 */
export const verifyTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (!driver.transactionPin) {
      return res.status(400).json({ error: 'No PIN set' });
    }

    const isPinValid = await bcrypt.compare(pin, driver.transactionPin);

    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    return res.json({ message: 'PIN verified successfully', valid: true });
  } catch (error) {
    console.error('Verify PIN error:', error);
    return res.status(500).json({ error: 'PIN verification failed' });
  }
};

// ============================================
// PROFILE
// ============================================

/**
 * Get Driver Profile
 * GET /api/driver/profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true,
            isEmailVerified: true,
            isPhoneVerified: true,
          },
        },
        vehicle: {
          include: {
            park: true,
          },
        },
        assignedRoute: true,
      },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    return res.json({
      id: driver.id,
      firstName: driver.firstName,
      lastName: driver.lastName,
      email: driver.user.email,
      phoneNumber: driver.user.phoneNumber,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      isVerified: driver.isVerified,
      isAvailableToday: driver.isAvailableToday,
      tier: driver.tier,
      profilePicture: driver.profilePicture,
      walletBalance: driver.walletBalance,
      vehicle: driver.vehicle,
      assignedRoute: driver.assignedRoute,
      lastCheckInDate: driver.lastCheckInDate,
      createdAt: driver.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update Driver Profile
 * PUT /api/driver/profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { firstName, lastName, profilePicture } = req.body;

    const driver = await prisma.driver.findUnique({
      where: { userId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        firstName: firstName || driver.firstName,
        lastName: lastName || driver.lastName,
        profilePicture: profilePicture || driver.profilePicture,
      },
    });

    return res.json({
      message: 'Profile updated successfully',
      driver: {
        id: updatedDriver.id,
        firstName: updatedDriver.firstName,
        lastName: updatedDriver.lastName,
        profilePicture: updatedDriver.profilePicture,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};