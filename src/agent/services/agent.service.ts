import { prisma } from '../../shared/config/database';
import * as bcrypt from 'bcryptjs';
import { createError } from '../../shared/middleware/error.middleware';
import { SMSService } from '../../identity/services/sms.service';
import { BiometricService } from '../../identity/services/biometric.service';
import { MonnifyService } from '../../wallet-money/services/monnify.service';
import { ProfileService } from '../../identity/services/profile.service';

const smsService = new SMSService();
const biometricService = new BiometricService();
const monnifyService = new MonnifyService();
const profileService = new ProfileService();

export class AgentService {
  // ============================================
  // AUTHENTICATION & ONBOARDING
  // ============================================

  async deviceSetup(deviceId: string, deviceModel?: string, osVersion?: string) {
    if (!deviceId) {
      throw createError('Device ID is required', 400);
    }

    const existingDevice = await prisma.device.findUnique({ where: { deviceId } });

    if (existingDevice) {
      const updatedDevice = await prisma.device.update({
        where: { deviceId },
        data: { lastActive: new Date() },
      });
      return { message: 'Device already registered', device: updatedDevice };
    }

    const device = await prisma.device.create({
      data: {
        deviceId,
        deviceModel: deviceModel || 'Unknown',
        osVersion: osVersion || 'Unknown',
        status: 'ACTIVE',
      },
    });

    return { message: 'Device initialized successfully', device, isNew: true };
  }

  async sendAgentRegistrationOTP(phoneNumber: string) {
    if (!phoneNumber) {
      throw createError('Phone number is required', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });

    // A phone number already tied to a different role (PASSENGER, DRIVER,
    // PARK_MANAGER) is blocked outright - no cross-role conversion. Only an
    // AGENT row that never finished verification is allowed to get a fresh
    // OTP on the same number; a fully-verified AGENT is also blocked as a
    // duplicate registration.
    if (existingUser && existingUser.role !== 'AGENT') {
      throw createError(
        `This phone number is already registered as a ${existingUser.role.toLowerCase()}. Please use a different number to register as an agent.`,
        400
      );
    }

    if (existingUser && existingUser.role === 'AGENT' && existingUser.isPhoneVerified) {
      throw createError('Agent with this phone number already exists', 400);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user = existingUser;
    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
      user = await prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@tyap.agent`,
          password: tempPassword,
          role: 'AGENT',
        },
      });
    } else {
      // Invalidate any previous unused PHONE_VERIFICATION codes for this user
      // so only the newest OTP is ever valid - same convention resendVerificationCode
      // uses in auth.service.ts.
      await prisma.verificationCode.updateMany({
        where: { userId: user.id, type: 'PHONE_VERIFICATION', isUsed: false },
        data: { isUsed: true },
      });
    }

    await prisma.verificationCode.create({
      data: { userId: user.id, code: otpCode, type: 'PHONE_VERIFICATION', expiresAt },
    });

    await smsService.sendVerificationSMS(phoneNumber, otpCode);

    return { phoneNumber };
  }

  async verifyAgentRegistrationOTP(phoneNumber: string, otp: string) {
    if (!phoneNumber || !otp) {
      throw createError('Phone number and OTP are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      throw createError('User not found', 404);
    }

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'PHONE_VERIFICATION',
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verificationCode) {
      throw createError('Invalid or expired OTP', 400);
    }

    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    // Role is never changed here - sendAgentRegistrationOTP already blocks
    // any phone number tied to a different role before an OTP is even issued,
    // so by the time verification succeeds this user is guaranteed to already
    // be role AGENT (either pre-existing or just created in send-otp).
    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    const sessionToken = `SESSION-${Date.now()}-${user.id}`;

    return { userId: user.id, sessionToken, nextStep: 'complete-profile' };
  }

  async completeAgentProfile(userId: string, body: any) {
    const {
      step,
      firstName,
      lastName,
      businessName,
      email,
      bvn,
      nin,
      residentialAddress,
      state,
      lga,
      parkId,
    } = body;

    if (!step) {
      throw createError('Step number is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createError('User not found', 404);
    }

    let agent = await prisma.agent.findUnique({ where: { userId } });

    if (step === 1) {
      if (!firstName || !lastName) {
        throw createError('First name and last name are required', 400);
      }

      if (agent) {
        agent = await prisma.agent.update({
          where: { id: agent.id },
          data: { firstName, lastName, businessName },
        });
      } else {
        const agentCode = `AGT-${Date.now().toString().slice(-6)}`;
        agent = await prisma.agent.create({
          data: {
            userId,
            firstName,
            lastName,
            businessName,
            agentCode,
            kycStatus: 'PENDING',
            isActive: false,
          },
        });
      }

      if (email) {
        await prisma.user.update({ where: { id: userId }, data: { email } });
      }

      return { agent, nextStep: 2 };
    }

    if (step === 2) {
      if (!agent) {
        throw createError('Please complete step 1 first', 400);
      }
      if (!bvn && !nin) {
        throw createError('Either BVN or NIN is required', 400);
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { bvn: bvn || agent.bvn, nin: nin || agent.nin },
      });

      return { agent, nextStep: 3 };
    }

    if (step === 3) {
      if (!agent) {
        throw createError('Please complete previous steps first', 400);
      }
      if (!residentialAddress || !state || !lga || !parkId) {
        throw createError('All address fields are required', 400);
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { residentialAddress, state, lga, parkId },
      });

      return { agent, nextStep: 'upload-documents' };
    }

    throw createError('Invalid step number', 400);
  }

  async uploadAgentDocument(userId: string, documentType: string, documentUrl: string, documentNumber?: string) {
    if (!documentType || !documentUrl) {
      throw createError('Document type and URL are required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const document = await prisma.document.create({
      data: { userId, documentType, url: documentUrl, documentNumber, status: 'PENDING' },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { idDocumentUrl: documentUrl },
    });

    return { document, nextStep: 'submit-biometric' };
  }

  async submitAgentBiometric(userId: string, biometricData: any) {
    if (!biometricData) {
      throw createError('Biometric data is required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    await biometricService.registerBiometric(userId, biometricData);

    await prisma.agent.update({
      where: { id: agent.id },
      data: { kycStatus: 'APPROVED', isActive: true },
    });

    return { status: 'APPROVED', nextStep: 'dashboard' };
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getAgentDashboard(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: {
        user: { select: { email: true, phoneNumber: true } },
        park: true,
      },
    });

    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        category: { in: ['COMMISSION', 'WALLET_TOPUP'] },
        status: 'SUCCESS',
        createdAt: { gte: today },
      },
    });

    const todayEarnings = todayTransactions.reduce(
      (sum: number, transaction: any) => sum + Number(transaction.amount),
      0
    );

    const passengersOnboardedToday = await prisma.passenger.count({
      where: { createdAt: { gte: today } },
    });

    const [onboardingEarnings, commissionEarnings] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, category: 'WALLET_TOPUP', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, category: 'COMMISSION', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    const totalOnboardingEarnings = Number(onboardingEarnings._sum.amount || 0);
    const totalCommissionEarnings = Number(commissionEarnings._sum.amount || 0);

    return {
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        agentCode: agent.agentCode,
        kycStatus: agent.kycStatus,
        isActive: agent.isActive,
      },
      park: agent.park,
      wallet: { balance: agent.walletBalance },
      todayEarnings,
      passengersOnboardedToday,
      earningsBreakdown: {
        onboardings: totalOnboardingEarnings,
        commissions: totalCommissionEarnings,
        total: totalOnboardingEarnings + totalCommissionEarnings,
      },
    };
  }

  // ============================================
  // PASSENGER ONBOARDING
  // ============================================

  async sendPassengerOTP(phoneNumber: string) {
    if (!phoneNumber) {
      throw createError('Phone number is required', 400);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    // Strict one-role-per-number rule: a number already tied to DRIVER, AGENT,
    // or PARK_MANAGER cannot also be onboarded as a PASSENGER.
    if (user && user.role !== 'PASSENGER') {
      throw createError(
        `This phone number is already registered as a ${user.role.toLowerCase()}. Please use a different number to onboard as a passenger.`,
        400
      );
    }

    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
      user = await prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@tyap.temp`,
          password: tempPassword,
          role: 'PASSENGER',
        },
      });
    }

    await prisma.verificationCode.create({
      data: { userId: user.id, code: otpCode, type: 'PHONE_VERIFICATION', expiresAt },
    });

    await smsService.sendVerificationSMS(phoneNumber, otpCode);

    return { phoneNumber };
  }

  async verifyPassengerOTP(phoneNumber: string, otp: string) {
    if (!phoneNumber || !otp) {
      throw createError('Phone number and OTP are required', 400);
    }

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      throw createError('User not found', 404);
    }

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'PHONE_VERIFICATION',
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verificationCode) {
      throw createError('Invalid or expired OTP', 400);
    }

    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });

    return { userId: user.id };
  }

  async createPassenger(agentUserId: string, body: any) {
    const {
      phoneNumber,
      firstName,
      lastName,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
    } = body;

    if (!phoneNumber || !firstName || !lastName) {
      throw createError('Phone number, first name, and last name are required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) {
      throw createError('User not found. Please verify phone first.', 404);
    }

    const existingPassenger = await prisma.passenger.findUnique({ where: { userId: user.id } });
    if (existingPassenger) {
      throw createError('Passenger already exists', 400);
    }

    const passenger = await prisma.passenger.create({
      data: {
        userId: user.id,
        agentId: agent.id,
        firstName,
        lastName,
        nextOfKinName,
        nextOfKinPhone,
        nextOfKinRelationship,
        tier: 'TIER_1',
      },
    });

    return {
      id: passenger.id,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      tier: passenger.tier,
    };
  }

  async getPassengerProfile(passengerId: string) {
    if (!passengerId) {
      throw createError('Passenger ID is required', 400);
    }

    // userId is a plain scalar field on Passenger - no include needed here,
    // profileService.getProfile() below does its own full user fetch anyway.
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      select: { userId: true },
    });

    if (!passenger) {
      throw createError('Passenger not found', 404);
    }

    return profileService.getProfile(passenger.userId);
  }

  async capturePassengerBiometric(agentUserId: string, passengerId: string, biometricData: any, deviceId?: string) {
    if (!biometricData) {
      throw createError('Biometric data is required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) {
      throw createError('Unauthorized: Only agents can capture biometrics', 403);
    }

    const passenger = await prisma.passenger.findUnique({ where: { id: passengerId } });
    if (!passenger) {
      throw createError('Passenger not found', 404);
    }

    await biometricService.registerBiometric(passenger.userId, biometricData);

    await prisma.biometricData.create({
      data: {
        userId: passenger.userId,
        userType: 'PASSENGER',
        templateData: biometricData,
        deviceId: deviceId || null,
      },
    });
  }

  async activatePassengerWallet(agentUserId: string, passengerId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId: agentUserId },
      include: { park: true },
    });

    if (!agent) {
      throw createError('Agent not found', 404);
    }

    if (!agent.park) {
      throw createError('Agent is not assigned to a park. Cannot activate wallet.', 400);
    }

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { user: true },
    });

    if (!passenger) {
      throw createError('Passenger not found', 404);
    }

    const park = agent.park as any;
    const activationAmount = Number(park.onboardingPrice || 500);
    const commissionRate = Number(agent.commissionRate || 20);
    const agentCommission = (activationAmount * commissionRate) / 100;

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: { tier: 'TIER_1' },
      });

      const passengerTransaction = await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'CREDIT',
          category: 'WALLET_TOPUP',
          amount: 0,
          balanceBefore: passenger.walletBalance,
          balanceAfter: passenger.walletBalance,
          status: 'SUCCESS',
          reference: `ACT-${Date.now()}`,
          description: `Account activated at ${agent.park?.name}`,
        },
      });

      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: { walletBalance: { increment: agentCommission } },
      });

      await tx.transaction.create({
        data: {
          userId: agent.userId,
          userType: 'AGENT',
          type: 'CREDIT',
          category: 'COMMISSION',
          amount: agentCommission,
          balanceBefore: agent.walletBalance,
          balanceAfter: updatedAgent.walletBalance,
          status: 'SUCCESS',
          reference: `COM-ACT-${Date.now()}`,
          description: `Commission from passenger activation (${passengerId})`,
        },
      });

      return { updatedPassenger, passengerTransaction, agentCommission };
    });

    return {
      park: agent.park.name,
      onboardingPrice: activationAmount,
      agentCommission: result.agentCommission,
      passengerTier: result.updatedPassenger.tier,
    };
  }

  // ============================================
  // DRIVER REGISTRATION
  // ============================================

  async createDriver(agentUserId: string, body: any) {
    const {
      firstName,
      lastName,
      phoneNumber,
      assignedRouteId,
      plateNumber,
      seatCapacity,
      bankName,
      bankAccountNumber,
      bankAccountName,
      licenseNumber = `DRV-${Date.now()}`,
      licenseExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleMake = 'Generic',
      vehicleModel = 'Transport',
    } = body;

    if (!firstName || !lastName || !phoneNumber || !plateNumber || !seatCapacity) {
      throw createError('Required fields missing: Name, Phone, Plate, and Capacity are mandatory', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let user = await tx.user.findUnique({ where: { phoneNumber } });

      // Strict one-role-per-number rule, same as agent/passenger onboarding:
      // a number already tied to PASSENGER, AGENT, or PARK_MANAGER cannot
      // also be registered as a DRIVER.
      if (user && user.role !== 'DRIVER') {
        throw createError(
          `This phone number is already registered as a ${user.role.toLowerCase()}. Please use a different number to register as a driver.`,
          400
        );
      }

      if (!user) {
        const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
        user = await tx.user.create({
          data: {
            phoneNumber,
            email: `${phoneNumber}@tyap.driver`,
            password: tempPassword,
            role: 'DRIVER',
          },
        });
      } else {
        const existingDriver = await tx.driver.findUnique({ where: { userId: user.id } });
        if (existingDriver) {
          throw createError('This user is already registered as a driver', 400);
        }
      }

      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          licenseNumber,
          licenseExpiry: new Date(licenseExpiry),
          assignedRouteId,
          tier: 'TIER_1',
          isVerified: false,
        },
      });

      const vehicle = await tx.vehicle.create({
        data: {
          driverId: driver.id,
          plateNumber,
          make: vehicleMake,
          model: vehicleModel,
          capacity: parseInt(seatCapacity),
          vehicleType: 'BUS',
          currentParkId: agent.parkId,
        },
      });

      if (bankAccountNumber && bankName) {
        await tx.bankAccount.create({
          data: {
            userId: user.id,
            accountName: bankAccountName || `${firstName} ${lastName}`,
            accountNumber: bankAccountNumber,
            bankName,
            isDefault: true,
          },
        });
      }

      return { user, driver, vehicle };
    });

    return {
      driver: {
        id: result.driver.id,
        firstName: result.driver.firstName,
        lastName: result.driver.lastName,
        licenseNumber: result.driver.licenseNumber,
        isVerified: result.driver.isVerified,
      },
      vehicle: {
        id: result.vehicle.id,
        plateNumber: result.vehicle.plateNumber,
      },
    };
  }

  async captureDriverBiometric(agentUserId: string, driverId: string, biometricData: any, deviceId?: string) {
    if (!biometricData) {
      throw createError('Biometric data is required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) {
      throw createError('Unauthorized: Only agents can capture biometrics', 403);
    }

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.driver.update({ where: { id: driverId }, data: { biometricData } });

      await tx.biometricData.create({
        data: {
          userId: driverId,
          userType: 'DRIVER',
          templateData: biometricData,
          deviceId: deviceId || null,
        },
      });
    });
  }

  async verifyDriver(agentUserId: string, driverId: string) {
    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) {
      throw createError('Unauthorized: Only agents can verify drivers', 403);
    }

    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) {
      throw createError('Driver not found', 404);
    }

    if (!driver.biometricData) {
      throw createError('Cannot verify driver: Biometric data must be captured first', 400);
    }

    await prisma.driver.update({ where: { id: driverId }, data: { isVerified: true } });
  }

  async getAvailableRoutes() {
    return prisma.route.findMany({
      where: { isActive: true },
      include: { originPark: true, destinationPark: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAvailableParks() {
    return prisma.park.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ============================================
  // WALLET & TRANSACTIONS
  // ============================================

  async getWalletBalance(userId: string) {
    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { balance: agent.walletBalance, recentTransactions };
  }

  async topUpPassengerWallet(userId: string, passengerId: string, amount: number, method: string) {
    if (!passengerId || !amount || !method) {
      throw createError('Passenger ID, amount, and method are required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { user: true },
    });
    if (!passenger) {
      throw createError('Passenger not found', 404);
    }

    const amountToTransfer = Number(amount);

    const result = await prisma.$transaction(async (tx: any) => {
      const currentAgent = await tx.agent.findUnique({ where: { id: agent.id } });
      if (!currentAgent || currentAgent.walletBalance.lt(amountToTransfer)) {
        throw createError('Insufficient digital balance to perform this transfer.', 400);
      }

      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: { walletBalance: { decrement: amountToTransfer } },
      });

      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: { walletBalance: { increment: amountToTransfer } },
      });

      await tx.user.update({
        where: { id: passenger.userId },
        data: { walletBalance: { increment: amountToTransfer } },
      });

      const agentTransaction = await tx.transaction.create({
        data: {
          userId: agent.userId,
          userType: 'AGENT',
          type: 'DEBIT',
          category: 'TRANSFER',
          amount: amountToTransfer,
          balanceBefore: agent.walletBalance,
          balanceAfter: updatedAgent.walletBalance,
          status: 'SUCCESS',
          reference: `AGT-XFR-${Date.now()}`,
          description: `Digital balance transferred to passenger ${passenger.user.phoneNumber}`,
          metadata: { passengerId, method },
        },
      });

      const passengerTransaction = await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'CREDIT',
          category: 'WALLET_TOPUP',
          amount: amountToTransfer,
          balanceBefore: passenger.walletBalance,
          balanceAfter: updatedPassenger.walletBalance,
          status: 'SUCCESS',
          reference: `PAS-RCV-${Date.now()}`,
          description: `Wallet funded by agent ${agent.agentCode}`,
          metadata: { agentId: agent.id, method },
        },
      });

      return { agentTransaction, passengerTransaction, updatedAgent, updatedPassenger };
    });

    return {
      amountTransferred: amountToTransfer,
      passengerNewBalance: result.updatedPassenger.walletBalance,
      agentNewBalance: result.updatedAgent.walletBalance,
    };
  }

  async withdrawEarnings(userId: string, amount: number, bankAccountId: string, pin: string) {
    if (!amount || !bankAccountId || !pin) {
      throw createError('Amount, bank account, and PIN are required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId }, include: { user: true } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    if (!agent.transactionPin) {
      throw createError('Please set up your transaction PIN first', 400);
    }

    const isPinValid = await bcrypt.compare(pin, agent.transactionPin);
    if (!isPinValid) {
      throw createError('Invalid PIN', 401);
    }

    const withdrawalAmount = Number(amount);

    const bankAccount = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!bankAccount || bankAccount.userId !== userId) {
      throw createError('Bank account not found', 404);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: { walletBalance: { decrement: withdrawalAmount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: userId as string,
          userType: 'AGENT',
          type: 'DEBIT',
          category: 'TRANSFER',
          amount: withdrawalAmount,
          balanceBefore: agent.walletBalance,
          balanceAfter: updatedAgent.walletBalance,
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

      return { transaction, updatedAgent };
    });

    try {
      const transferResponse = await monnifyService.initiateTransfer({
        amount: Number(withdrawalAmount),
        reference: result.transaction.reference,
        narration: `T-YAP Agent Withdrawal: ${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
        destinationAccountNumber: bankAccount.accountNumber,
        destinationBankCode: bankAccount.bankCode || '',
        destinationAccountName: bankAccount.accountName,
        destinationEmail: agent.user.email,
      });

      const updatedTx = await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: {
          status: transferResponse.status === 'SUCCESS' ? 'SUCCESS' : 'PROCESSING',
          metadata: {
            ...((result.transaction.metadata as object) || {}),
            monnifyResponse: transferResponse,
          },
        },
      });

      return {
        transaction: updatedTx,
        newBalance: result.updatedAgent.walletBalance,
        providerResponse: transferResponse,
      };
    } catch (apiError: any) {
      console.error('Monnify transfer initiation failed:', apiError);

      await prisma.$transaction([
        prisma.agent.update({
          where: { id: agent.id },
          data: { walletBalance: { increment: withdrawalAmount } },
        }),
        prisma.user.update({
          where: { id: userId },
          data: { walletBalance: { increment: Number(withdrawalAmount) } },
        }),
        prisma.transaction.update({
          where: { id: result.transaction.id },
          data: { status: 'FAILED' },
        }),
      ]);

      throw createError('Failed to initiate transfer with payment provider. Funds have been refunded.', 502);
    }
  }

  async getTransactionHistory(userId: string, query: { page?: string; limit?: string; category?: string; status?: string }) {
    const { page = '1', limit = '20', category, status } = query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (category) where.category = category;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };
  }

  async getEarningsBreakdown(userId: string) {
    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.transaction.aggregate({
      where: { userId, category: 'COMMISSION', status: 'SUCCESS', createdAt: { gte: today } },
      _sum: { amount: true },
    });

    const onboardedToday = await prisma.passenger.count({
      where: { agentId: agent.id, createdAt: { gte: today } },
    });

    const onboardingStats = await prisma.transaction.aggregate({
      where: { userId, category: 'COMMISSION', description: { contains: 'activation' }, status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const commissionStats = await prisma.transaction.aggregate({
      where: { userId, category: 'COMMISSION', description: { contains: 'top-up' }, status: 'SUCCESS' },
      _sum: { amount: true },
    });

    const onboardingTotal = Number(onboardingStats._sum.amount || 0);
    const commissionTotal = Number(commissionStats._sum.amount || 0);
    const todayEarnings = Number(todayStats._sum.amount || 0);

    const recentActivities = await prisma.passenger.findMany({
      where: { agentId: agent.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    });

    return {
      todayEarnings,
      onboardedToday,
      totalEarnings: onboardingTotal + commissionTotal,
      withdrawableBalance: agent.walletBalance,
      breakdown: { onboarding: onboardingTotal, commissions: commissionTotal, referrals: 0 },
      recentActivities: recentActivities.map((a: any) => ({
        id: a.id,
        title: `Onboarded ${a.firstName} ${a.lastName}`,
        time: a.createdAt,
      })),
    };
  }

  async cashOut(userId: string, amount: number, biometricData: any) {
    if (!amount || !biometricData) {
      throw createError('Amount and biometric data are required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const isVerified = await biometricService.verifyBiometric(userId, biometricData);
    const cashOutAmount = Number(amount);

    if (!isVerified) {
      throw createError('Biometric verification failed', 401);
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const currentAgent = await tx.agent.findUnique({ where: { userId } });
      if (!currentAgent || currentAgent.walletBalance.lt(cashOutAmount)) {
        throw createError('Insufficient balance', 400);
      }

      const updatedAgent = await tx.agent.update({
        where: { id: currentAgent.id },
        data: { walletBalance: { decrement: cashOutAmount } },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: userId as string,
          userType: 'AGENT',
          type: 'DEBIT',
          category: 'TRANSFER',
          amount: cashOutAmount,
          balanceBefore: currentAgent.walletBalance,
          balanceAfter: updatedAgent.walletBalance,
          status: 'SUCCESS',
          reference: `CASH-${Date.now()}`,
          description: 'Cash withdrawal (Biometric)',
        },
      });

      return { transaction, updatedAgent };
    });

    return { transaction: result.transaction, newBalance: result.updatedAgent.walletBalance };
  }

  // ============================================
  // TRANSACTION PIN MANAGEMENT
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

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.agent.update({ where: { id: agent.id }, data: { transactionPin: hashedPin } });
  }

  async verifyTransactionPin(userId: string, pin: string) {
    if (!pin) {
      throw createError('PIN is required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    if (!agent.transactionPin) {
      throw createError('No PIN set', 400);
    }

    const isPinValid = await bcrypt.compare(pin, agent.transactionPin);
    if (!isPinValid) {
      throw createError('Invalid PIN', 401);
    }

    return { valid: true };
  }

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

  async getAgentProfile(userId: string) {
    // Lightweight existence check only - profileService.getProfile() below only
    // throws 404 for a missing User, not a missing Agent row, so this check is
    // still needed to return the correct "Agent not found" error. Kept minimal
    // (id only, no includes) rather than the full agent+user+park fetch that
    // used to be pulled here and then discarded.
    const agent = await prisma.agent.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!agent) {
      throw createError('Agent not found', 404);
    }

    return profileService.getProfile(userId);
  }

  async updateAgentProfile(userId: string, body: any) {
    const { firstName, lastName, businessName, residentialAddress, state, lga } = body;

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        firstName: firstName || agent.firstName,
        lastName: lastName || agent.lastName,
        businessName: businessName || agent.businessName,
        residentialAddress: residentialAddress || agent.residentialAddress,
        state: state || agent.state,
        lga: lga || agent.lga,
      },
    });

    return {
      id: updatedAgent.id,
      firstName: updatedAgent.firstName,
      lastName: updatedAgent.lastName,
      businessName: updatedAgent.businessName,
      residentialAddress: updatedAgent.residentialAddress,
      state: updatedAgent.state,
      lga: updatedAgent.lga,
    };
  }

  // ============================================
  // SETTINGS & MANAGEMENT
  // ============================================

  async getAssignedPark(userId: string) {
    const agent = await prisma.agent.findUnique({ where: { userId }, include: { park: true } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    return agent.park;
  }

  async switchPark(userId: string, parkId: string) {
    if (!parkId) {
      throw createError('Park ID is required', 400);
    }

    const agent = await prisma.agent.findUnique({ where: { userId } });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const park = await prisma.park.findUnique({ where: { id: parkId } });
    if (!park) {
      throw createError('Park not found', 404);
    }

    await prisma.agent.update({ where: { id: agent.id }, data: { parkId } });

    return park;
  }

  // ============================================
  // SUPPORT
  // ============================================

  async submitFaultReport(userId: string, subject: string, message: string, category?: string) {
    if (!subject || !message) {
      throw createError('Subject and message are required', 400);
    }

    return prisma.supportTicket.create({
      data: {
        userId,
        subject,
        message,
        category: category || 'TECHNICAL',
        status: 'OPEN',
        priority: 'NORMAL',
      },
    });
  }

  async getAgentGuide() {
    return prisma.helpContent.findMany({
      where: { category: 'AGENT', isPublished: true },
      orderBy: { order: 'asc' },
    });
  }
}

export const agentService = new AgentService();