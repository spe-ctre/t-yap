import { prisma } from '../../shared/config/database';
import * as bcrypt from 'bcryptjs';
import { createError } from '../../shared/middleware/error.middleware';
import { MonnifyService } from '../../wallet-money/services/monnify.service';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination';

const monnifyService = new MonnifyService();

export class DriverService {
  // ============================================
  // DASHBOARD / HOME
  // ============================================

  async getDriverDashboard(userId: string) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, phoneNumber: true, walletBalance: true } },
        vehicle: { include: { park: true } },
        assignedRoute: true,
      },
    });

    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: { userId, category: 'FARE_PAYMENT', status: 'SUCCESS', createdAt: { gte: today } },
    });

    const todayEarnings = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { trip: true },
    });

    const activeTrip = await prisma.trip.findFirst({
      where: { driverId: driver.id, status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } },
      include: {
        route: true,
        user: { select: { id: true, email: true, phoneNumber: true } },
      },
    });

    return {
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
        balance: 0,
        availableBalance: 0,
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
    };
  }

  // ============================================
  // CHECK-IN / AVAILABILITY
  // ============================================

  async checkIn(userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: { isAvailableToday: true, lastCheckInDate: new Date() },
    });

    return {
      id: updatedDriver.id,
      isAvailableToday: updatedDriver.isAvailableToday,
      lastCheckInDate: updatedDriver.lastCheckInDate,
    };
  }

  async checkOut(userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const activeTrip = await prisma.trip.findFirst({
      where: { driverId: driver.id, status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] } },
    });

    if (activeTrip) {
      throw createError('Cannot check out while you have active trips', 400);
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: { isAvailableToday: false },
    });

    return { id: updatedDriver.id, isAvailableToday: updatedDriver.isAvailableToday };
  }

  // ============================================
  // TRIP MANAGEMENT
  // ============================================

  async startTrip(userId: string, routeId: string, passengerId: string, fare: number) {
    if (!routeId || !passengerId || !fare) {
      throw createError('Route ID, Passenger ID, and fare are required', 400);
    }

    const driver = await prisma.driver.findUnique({ where: { userId }, include: { vehicle: true } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    if (!driver.vehicle) {
      throw createError('No vehicle assigned to driver', 400);
    }

    if (!driver.isAvailableToday) {
      throw createError('Please check in before starting a trip', 400);
    }

    // Was previously just checking any User row exists with this ID - tightened
    // to actually confirm this user is a real, onboarded passenger, not any
    // arbitrary user (agent, driver, park manager) accidentally or maliciously
    // passed in as passengerId. Also excludes soft-deleted users - deletion
    // anonymizes email/phone but leaves the row in place, so this must be
    // checked explicitly or a deleted account could still be booked a trip.
    const passenger = await prisma.user.findUnique({
      where: { id: passengerId },
      include: { passenger: true },
    });
    if (!passenger || passenger.deletedAt) {
      throw createError('Passenger not found', 404);
    }
    if (passenger.role !== 'PASSENGER' || !passenger.passenger) {
      throw createError('This user is not a registered passenger', 400);
    }

    const route = await prisma.route.findUnique({ where: { id: routeId } });
    if (!route) {
      throw createError('Route not found', 404);
    }

    return prisma.trip.create({
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
        user: { select: { id: true, email: true, phoneNumber: true } },
      },
    });
  }

  async completeTrip(userId: string, tripId: string) {
    // Flat fee T-Yap keeps per completed (fingerprint-validated) trip payment,
    // deducted from the passenger's transport wallet separately from the fare
    // itself. Plain/hardcoded for now, per explicit instruction - revisit when
    // we test the park-management wallet/transaction endpoints properly.
    const PLATFORM_FEE = 50;

    const driver = await prisma.driver.findUnique({ where: { userId }, include: { vehicle: { include: { park: true } } } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      throw createError('Trip not found', 404);
    }

    if (trip.driverId !== driver.id) {
      throw createError('This is not your trip', 403);
    }

    if (trip.status === 'COMPLETED') {
      throw createError('Trip already completed', 400);
    }

    const passenger = await prisma.passenger.findUnique({
      where: { userId: trip.passengerId },
      include: { user: true },
    });

    if (!passenger || !passenger.user) {
      throw createError('Passenger not found', 404);
    }

    const fare = Number(trip.fare);
    const totalPassengerCharge = fare + PLATFORM_FEE;

    if (Number(passenger.transportWalletBalance) < totalPassengerCharge) {
      throw createError('Passenger has insufficient transport wallet balance', 400);
    }

    // Plain lookup, for now: whichever ParkManager is assigned to this
    // vehicle's current park gets the commission. If a park has more than one
    // manager, or none at all, this is exactly the kind of thing to revisit
    // when we get to the park-management endpoints - flagged, not solved here.
    const parkManager = driver.vehicle?.park
      ? await prisma.parkManager.findFirst({ where: { parkId: driver.vehicle.park.id }, include: { user: true } })
      : null;

    if (!parkManager) {
      throw createError('No park manager found for this driver\'s park - cannot process commission split', 400);
    }

    const commissionRate = Number(parkManager.commissionRate || 5);
    const parkCommission = (fare * commissionRate) / 100;
    const driverPayout = fare - parkCommission;

    return prisma.$transaction(async (tx: any) => {
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'COMPLETED', arrivalTime: new Date() },
      });

      // Debit passenger: fare + platform fee, in one wallet movement, but
      // recorded as two separate transaction rows for a clean audit trail -
      // one for the actual fare, one for T-Yap's flat platform fee.
      const updatedPassenger = await tx.passenger.update({
        where: { userId: trip.passengerId },
        data: { transportWalletBalance: { decrement: totalPassengerCharge } },
      });

      await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'DEBIT',
          category: 'FARE_PAYMENT',
          amount: fare,
          balanceBefore: passenger.transportWalletBalance,
          balanceAfter: Number(passenger.transportWalletBalance) - PLATFORM_FEE,
          status: 'SUCCESS',
          reference: `FARE-OUT-${Date.now()}`,
          description: `Fare payment from transport wallet for trip to ${trip.routeId}`,
          tripId: trip.id,
        },
      });

      await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'DEBIT',
          category: 'REVENUE_SPLIT',
          amount: PLATFORM_FEE,
          balanceBefore: Number(passenger.transportWalletBalance) - fare,
          balanceAfter: updatedPassenger.transportWalletBalance,
          status: 'SUCCESS',
          reference: `PLATFORM-FEE-${Date.now()}`,
          description: `T-Yap platform fee for trip ${trip.id}`,
          tripId: trip.id,
        },
      });

      const driverTransaction = await tx.transaction.create({
        data: {
          userId: driver.userId,
          userType: 'DRIVER',
          type: 'CREDIT',
          category: 'FARE_PAYMENT',
          amount: driverPayout,
          balanceBefore: 0,
          balanceAfter: 0,
          status: 'SUCCESS',
          reference: `FARE-IN-${Date.now()}`,
          description: `Fare received for trip ${tripId} (after ${commissionRate}% park commission)`,
          tripId: trip.id,
          metadata: { tripId: trip.id, fare, parkCommission, commissionRate },
        },
      });

      // Credit park management: their commission cut of the fare, as its own
      // real receipt tied to this trip - not just a recalculated display
      // number, so a future commissionRate change never rewrites past earnings.
      await tx.parkManager.update({
        where: { id: parkManager.id },
        data: { walletBalance: { increment: parkCommission } },
      });

      const parkTransaction = await tx.transaction.create({
        data: {
          userId: parkManager.userId,
          userType: 'PARK_MANAGER',
          type: 'CREDIT',
          category: 'COMMISSION',
          amount: parkCommission,
          balanceBefore: parkManager.walletBalance,
          balanceAfter: Number(parkManager.walletBalance) + parkCommission,
          status: 'SUCCESS',
          reference: `PARK-COMM-${Date.now()}`,
          description: `Park commission (${commissionRate}%) for trip ${trip.id}`,
          tripId: trip.id,
        },
      });

      return { updatedTrip, driverTransaction, parkTransaction, breakdown: { fare, platformFee: PLATFORM_FEE, parkCommission, driverPayout } };
    });
  }

  async getPassengerChecklist(userId: string) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: { vehicle: true, assignedRoute: true },
    });

    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const pendingTrips = await prisma.trip.findMany({
      where: { routeId: driver.assignedRouteId || undefined, status: 'PENDING' },
      include: {
        user: { select: { id: true, email: true, phoneNumber: true } },
        route: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return pendingTrips.map((trip) => ({
      tripId: trip.id,
      passenger: trip.user,
      route: trip.route,
      fare: trip.fare,
      createdAt: trip.createdAt,
    }));
  }

  // ============================================
  // TRANSACTIONS
  // ============================================

  async getTransactions(userId: string, query: { page?: string; limit?: string; search?: string; category?: string; status?: string }) {
    const { search, category, status } = query;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(query);

    const where: any = { userId };
    if (search) where.description = { contains: search as string, mode: 'insensitive' };
    if (category) where.category = category;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: { trip: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: buildPaginationMeta(pageNum, limitNum, total),
    };
  }

  // ============================================
  // WALLET & BANK ACCOUNTS
  // ============================================

  async getWallet(userId: string) {
    const driver = await prisma.driver.findUnique({ where: { userId }, include: { user: true } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      balance: 0,
      availableBalance: 0,
      recentTransactions,
    };
  }

  async addBankAccount(userId: string, body: any) {
    const { accountName, accountNumber, bankName, bankCode, accountType, isDefault } = body;

    if (!accountName || !accountNumber || !bankName) {
      throw createError('Account name, account number, and bank name are required', 400);
    }

    if (isDefault) {
      await prisma.bankAccount.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    return prisma.bankAccount.create({
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
  }

  async getBankAccounts(userId: string) {
    return prisma.bankAccount.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async withdrawFunds(userId: string, amount: number, bankAccountId: string, pin: string) {
    throw createError('Drivers do not maintain in-app wallets. Payouts are transferred directly to your bank account upon shift settlement.', 400);
  }

  // ============================================
  // TRANSACTION PIN
  // ============================================

  async setTransactionPin(userId: string, pin: string, confirmPin: string) {
    if (!pin || !confirmPin) {
      throw createError('PIN and confirmation are required', 400);
    }
    if (pin !== confirmPin) {
      throw createError('PINs do not match', 400);
    }
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      throw createError('PIN must be 4 digits', 400);
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.driver.update({ where: { id: driver.id }, data: { transactionPin: hashedPin } });
  }

  async verifyTransactionPin(userId: string, pin: string) {
    if (!pin) {
      throw createError('PIN is required', 400);
    }

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    if (!driver.transactionPin) {
      throw createError('No PIN set', 400);
    }

    const isPinValid = await bcrypt.compare(pin, driver.transactionPin);
    if (!isPinValid) {
      throw createError('Invalid PIN', 401);
    }

    return { valid: true };
  }

  // ============================================
  // PROFILE
  // ============================================

  async getProfile(userId: string) {
    const driver = await prisma.driver.findUnique({
      where: { userId },
      include: {
        user: {
          select: { email: true, phoneNumber: true, isEmailVerified: true, isPhoneVerified: true },
        },
        vehicle: { include: { park: true } },
        assignedRoute: true,
      },
    });

    if (!driver) {
      throw createError('Driver not found', 404);
    }

    return {
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
      vehicle: driver.vehicle,
      assignedRoute: driver.assignedRoute,
      lastCheckInDate: driver.lastCheckInDate,
      createdAt: driver.createdAt,
    };
  }

  async updateProfile(userId: string, body: any) {
    const { firstName, lastName, profilePicture } = body;

    const driver = await prisma.driver.findUnique({ where: { userId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        firstName: firstName || driver.firstName,
        lastName: lastName || driver.lastName,
        profilePicture: profilePicture || driver.profilePicture,
      },
    });

    return {
      id: updatedDriver.id,
      firstName: updatedDriver.firstName,
      lastName: updatedDriver.lastName,
      profilePicture: updatedDriver.profilePicture,
    };
  }
}

export const driverService = new DriverService();