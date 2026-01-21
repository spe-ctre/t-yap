import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// AGENT AUTHENTICATION & ONBOARDING
// ============================================

/**
 * Device Setup/Initialization
 * POST /api/agent/auth/device-setup
 */
export const deviceSetup = async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceModel, osVersion } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }

    // Check if device already exists
    const existingDevice = await prisma.device.findUnique({
      where: { deviceId },
    });

    if (existingDevice) {
      // Update last active time
      const updatedDevice = await prisma.device.update({
        where: { deviceId },
        data: { lastActive: new Date() },
      });

      return res.json({
        message: 'Device already registered',
        device: updatedDevice,
      });
    }

    // Register new device
    const device = await prisma.device.create({
      data: {
        deviceId,
        deviceModel: deviceModel || 'Unknown',
        osVersion: osVersion || 'Unknown',
        status: 'ACTIVE',
      },
    });

    return res.status(201).json({
      message: 'Device initialized successfully',
      device,
    });
  } catch (error) {
    console.error('Device setup error:', error);
    return res.status(500).json({ error: 'Failed to initialize device' });
  }
};

/**
 * Send Agent Registration OTP
 * POST /api/agent/auth/send-otp
 */
export const sendAgentRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingUser && existingUser.role === 'AGENT') {
      return res.status(400).json({ 
        error: 'Agent with this phone number already exists' 
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create or find user
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
    }

    // Create verification code
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        type: 'PHONE_VERIFICATION',
        expiresAt,
      },
    });

    // TODO: Integrate SMS service provider
    console.log(`Agent Registration OTP for ${phoneNumber}: ${otpCode}`);

    return res.json({
      message: 'OTP sent successfully',
      phoneNumber,
      // Remove in production
      otp: otpCode,
    });
  } catch (error) {
    console.error('Send agent registration OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

/**
 * Verify Agent Registration OTP
 * POST /api/agent/auth/verify-otp
 */
export const verifyAgentRegistrationOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ 
        error: 'Phone number and OTP are required' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find valid verification code
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
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    // Update user phone verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    // Generate authentication token (simplified - use JWT in production)
    const sessionToken = `SESSION-${Date.now()}-${user.id}`;

    return res.json({
      message: 'Phone verified successfully',
      userId: user.id,
      sessionToken,
      nextStep: 'complete-profile',
    });
  } catch (error) {
    console.error('Verify agent registration OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

/**
 * Complete Agent Profile (3-Step Process)
 * POST /api/agent/auth/complete-profile
 */
export const completeAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      step,
      // Step 1: Personal Info
      firstName,
      lastName,
      businessName,
      email,
      // Step 2: KYC
      bvn,
      nin,
      // Step 3: Address
      residentialAddress,
      state,
      lga,
      parkId,
    } = req.body;

    if (!step) {
      return res.status(400).json({ error: 'Step number is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if agent profile exists
    let agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (step === 1) {
      // Step 1: Personal Information
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          error: 'First name and last name are required' 
        });
      }

      if (agent) {
        // Update existing agent
        agent = await prisma.agent.update({
          where: { id: agent.id },
          data: {
            firstName,
            lastName,
            businessName,
          },
        });
      } else {
        // Create new agent profile
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

      // Update email if provided
      if (email) {
        await prisma.user.update({
          where: { id: userId },
          data: { email },
        });
      }

      return res.json({
        message: 'Personal information saved',
        agent,
        nextStep: 2,
      });
    }

    if (step === 2) {
      // Step 2: KYC Information
      if (!agent) {
        return res.status(400).json({ 
          error: 'Please complete step 1 first' 
        });
      }

      if (!bvn && !nin) {
        return res.status(400).json({ 
          error: 'Either BVN or NIN is required' 
        });
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          bvn: bvn || agent.bvn,
          nin: nin || agent.nin,
        },
      });

      return res.json({
        message: 'KYC information saved',
        agent,
        nextStep: 3,
      });
    }

    if (step === 3) {
      // Step 3: Address Information
      if (!agent) {
        return res.status(400).json({ 
          error: 'Please complete previous steps first' 
        });
      }

      if (!residentialAddress || !state || !lga || !parkId) {
        return res.status(400).json({ 
          error: 'All address fields are required' 
        });
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          residentialAddress,
          state,
          lga,
          parkId,
        },
      });

      return res.json({
        message: 'Profile completed successfully',
        agent,
        nextStep: 'upload-documents',
      });
    }

    return res.status(400).json({ error: 'Invalid step number' });
  } catch (error) {
    console.error('Complete agent profile error:', error);
    return res.status(500).json({ error: 'Failed to complete profile' });
  }
};

/**
 * Upload Agent ID Document
 * POST /api/agent/auth/upload-document
 */
export const uploadAgentDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { documentType, documentUrl, documentNumber } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({ 
        error: 'Document type and URL are required' 
      });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        userId,
        documentType,
        url: documentUrl,
        documentNumber,
        status: 'PENDING',
      },
    });

    // Update agent's ID document URL
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        idDocumentUrl: documentUrl,
      },
    });

    return res.status(201).json({
      message: 'Document uploaded successfully',
      document,
      nextStep: 'submit-biometric',
    });
  } catch (error) {
    console.error('Upload agent document error:', error);
    return res.status(500).json({ error: 'Failed to upload document' });
  }
};

/**
 * Submit Agent Biometric Data
 * POST /api/agent/auth/submit-biometric
 */
export const submitAgentBiometric = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { biometricData } = req.body;

    if (!biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Store biometric data and mark as APPROVED
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        biometricData,
        kycStatus: 'APPROVED',
        isActive: true, // Activate agent after biometric submission
      },
    });

    return res.json({
      message: 'Registration completed successfully',
      status: 'APPROVED',
      nextStep: 'dashboard',
    });
  } catch (error) {
    console.error('Submit agent biometric error:', error);
    return res.status(500).json({ error: 'Failed to submit biometric data' });
  }
};

// ============================================
// DASHBOARD
// ============================================

/**
 * Get Agent Dashboard
 * GET /api/agent/dashboard
 */
export const getAgentDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            email: true,
            phoneNumber: true,
          },
        },
        park: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's transactions
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        category: { in: ['COMMISSION', 'WALLET_TOPUP'] },
        status: 'SUCCESS',
        createdAt: { gte: today },
      },
    });

    // Calculate today's earnings
    const todayEarnings = todayTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );

    // Count passengers onboarded today
    const passengersOnboardedToday = await prisma.passenger.count({
      where: {
        createdAt: { gte: today },
      },
    });

    // Get earnings breakdown using aggregates
    const [onboardingEarnings, commissionEarnings] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'WALLET_TOPUP',
          status: 'SUCCESS',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'COMMISSION',
          status: 'SUCCESS',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalOnboardingEarnings = Number(onboardingEarnings._sum.amount || 0);
    const totalCommissionEarnings = Number(commissionEarnings._sum.amount || 0);

    return res.json({
      agent: {
        id: agent.id,
        firstName: agent.firstName,
        lastName: agent.lastName,
        agentCode: agent.agentCode,
        kycStatus: agent.kycStatus,
        isActive: agent.isActive,
      },
      park: agent.park,
      wallet: {
        balance: agent.walletBalance,
      },
      todayEarnings,
      passengersOnboardedToday,
      earningsBreakdown: {
        onboardings: totalOnboardingEarnings,
        commissions: totalCommissionEarnings,
        total: totalOnboardingEarnings + totalCommissionEarnings,
      },
    });
  } catch (error) {
    console.error('Get agent dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

// ============================================
// PASSENGER ONBOARDING
// ============================================

/**
 * Send Passenger OTP
 * POST /api/agent/passengers/send-otp
 */
export const sendPassengerOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

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

    // Create verification code
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: otpCode,
        type: 'PHONE_VERIFICATION',
        expiresAt,
      },
    });

    // TODO: Integrate SMS service provider
    console.log(`OTP for ${phoneNumber}: ${otpCode}`);

    return res.json({
      message: 'OTP sent successfully',
      phoneNumber,
      // Remove in production
      otp: otpCode,
    });
  } catch (error) {
    console.error('Send passenger OTP error:', error);
    return res.status(500).json({ error: 'Failed to send OTP' });
  }
};

/**
 * Verify Passenger OTP
 * POST /api/agent/passengers/verify-otp
 */
export const verifyPassengerOTP = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find valid verification code
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
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    // Update user phone verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    return res.json({
      message: 'Phone verified successfully',
      userId: user.id,
    });
  } catch (error) {
    console.error('Verify passenger OTP error:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
};

/**
 * Create Passenger
 * POST /api/agent/passengers
 */
export const createPassenger = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      phoneNumber,
      firstName,
      lastName,
      nextOfKinName,
      nextOfKinPhone,
      nextOfKinRelationship,
    } = req.body;

    // Validate required fields
    if (!phoneNumber || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Phone number, first name, and last name are required',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found. Please verify phone first.' 
      });
    }

    // Check if passenger already exists
    const existingPassenger = await prisma.passenger.findUnique({
      where: { userId: user.id },
    });

    if (existingPassenger) {
      return res.status(400).json({ error: 'Passenger already exists' });
    }

    // Create new passenger
    const passenger = await prisma.passenger.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        nextOfKinName,
        nextOfKinPhone,
        nextOfKinRelationship,
        tier: 'TIER_1',
      },
    });

    return res.status(201).json({
      message: 'Passenger created successfully',
      passenger: {
        id: passenger.id,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        tier: passenger.tier,
      },
    });
  } catch (error) {
    console.error('Create passenger error:', error);
    return res.status(500).json({ error: 'Failed to create passenger' });
  }
};

/**
 * Capture Passenger Biometric
 * POST /api/agent/passengers/:passengerId/biometric
 */
export const capturePassengerBiometric = async (req: Request, res: Response) => {
  try {
    const { passengerId } = req.params;
    const { biometricData } = req.body;

    if (!biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    // Store biometric data
    await prisma.passenger.update({
      where: { id: passengerId },
      data: { biometricData },
    });

    return res.json({
      message: 'Biometric captured successfully',
    });
  } catch (error) {
    console.error('Capture passenger biometric error:', error);
    return res.status(500).json({ error: 'Failed to capture biometric' });
  }
};

/**
 * Activate Passenger Wallet
 * POST /api/agent/passengers/:passengerId/activate-wallet
 */
export const activatePassengerWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { passengerId } = req.params;
    const { activationFee = 500 } = req.body;

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify passenger exists
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { user: true },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const activationAmount = Number(activationFee);
    const newPassengerBalance = passenger.walletBalance.add(activationAmount);

    // Create activation transaction for passenger
    const passengerTransaction = await prisma.transaction.create({
      data: {
        userId: passenger.userId,
        userType: 'PASSENGER',
        type: 'CREDIT',
        category: 'WALLET_TOPUP',
        amount: activationAmount,
        balanceBefore: passenger.walletBalance,
        balanceAfter: newPassengerBalance,
        status: 'SUCCESS',
        reference: `ACT-${Date.now()}`,
        description: 'Wallet activation fee',
      },
    });

    // Update passenger wallet
    await prisma.passenger.update({
      where: { id: passengerId },
      data: {
        walletBalance: { increment: activationAmount },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: passenger.userId },
      data: {
        walletBalance: { increment: activationAmount },
      },
    });

    // Calculate agent commission
    const commissionRate = Number(agent.commissionRate || 10);
    const agentCommission = (activationAmount * commissionRate) / 100;
    const newAgentBalance = agent.walletBalance.add(agentCommission);

    // Create commission transaction for agent
    await prisma.transaction.create({
      data: {
        userId: agent.userId,
        userType: 'AGENT',
        type: 'CREDIT',
        category: 'COMMISSION',
        amount: agentCommission,
        balanceBefore: agent.walletBalance,
        balanceAfter: newAgentBalance,
        status: 'SUCCESS',
        reference: `COM-${Date.now()}`,
        description: `Commission from passenger activation (${passengerId})`,
      },
    });

    // Update agent wallet
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        walletBalance: { increment: agentCommission },
      },
    });

    return res.json({
      message: 'Wallet activated successfully',
      passenger: {
        id: passenger.id,
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        walletBalance: newPassengerBalance,
        tier: passenger.tier,
      },
      transaction: passengerTransaction,
      agentCommission,
    });
  } catch (error) {
    console.error('Activate passenger wallet error:', error);
    return res.status(500).json({ error: 'Failed to activate wallet' });
  }
};

// ============================================
// DRIVER REGISTRATION
// ============================================

/**
 * Create Driver
 * POST /api/agent/drivers
 */
export const createDriver = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      phoneNumber,
      firstName,
      lastName,
      licenseNumber,
      licenseExpiry,
      assignedRouteId,
      plateNumber,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      seatCapacity,
      vehicleType,
      bankAccountName,
      bankAccountNumber,
      bankName,
      bankCode,
    } = req.body;

    // Validate required fields
    if (
      !phoneNumber ||
      !firstName ||
      !lastName ||
      !licenseNumber ||
      !licenseExpiry ||
      !plateNumber ||
      !vehicleMake ||
      !vehicleModel ||
      !seatCapacity
    ) {
      return res.status(400).json({
        error: 'Required fields missing',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Create or find user for driver
    let user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      const tempPassword = await bcrypt.hash(Math.random().toString(), 10);
      user = await prisma.user.create({
        data: {
          phoneNumber,
          email: `${phoneNumber}@tyap.driver`,
          password: tempPassword,
          role: 'DRIVER',
        },
      });
    }

    // Create driver record
    const driver = await prisma.driver.create({
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

    // Create vehicle record
    const vehicle = await prisma.vehicle.create({
      data: {
        driverId: driver.id,
        plateNumber,
        make: vehicleMake,
        model: vehicleModel,
        year: vehicleYear ? parseInt(vehicleYear) : null,
        color: vehicleColor,
        capacity: parseInt(seatCapacity),
        vehicleType: vehicleType || 'BUS',
        currentParkId: agent.parkId,
      },
    });

    // Create bank account if provided
    if (bankAccountNumber && bankName) {
      await prisma.bankAccount.create({
        data: {
          userId: user.id,
          accountName: bankAccountName || `${firstName} ${lastName}`,
          accountNumber: bankAccountNumber,
          bankName,
          bankCode,
          isDefault: true,
        },
      });
    }

    return res.status(201).json({
      message: 'Driver created successfully',
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        licenseNumber: driver.licenseNumber,
        tier: driver.tier,
        isVerified: driver.isVerified,
      },
      vehicle: {
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
      },
    });
  } catch (error) {
    console.error('Create driver error:', error);
    return res.status(500).json({ error: 'Failed to create driver' });
  }
};

/**
 * Capture Driver Biometric
 * POST /api/agent/drivers/:driverId/biometric
 */
export const captureDriverBiometric = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { biometricData } = req.body;

    if (!biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Store biometric data
    await prisma.driver.update({
      where: { id: driverId },
      data: { biometricData },
    });

    return res.json({
      message: 'Biometric captured successfully',
    });
  } catch (error) {
    console.error('Capture driver biometric error:', error);
    return res.status(500).json({ error: 'Failed to capture biometric' });
  }
};

/**
 * Verify Driver
 * POST /api/agent/drivers/:driverId/verify
 */
export const verifyDriver = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Mark driver as verified
    await prisma.driver.update({
      where: { id: driverId },
      data: { isVerified: true },
    });

    return res.json({
      message: 'Driver verified successfully',
    });
  } catch (error) {
    console.error('Verify driver error:', error);
    return res.status(500).json({ error: 'Failed to verify driver' });
  }
};

/**
 * Get Available Routes
 * GET /api/agent/routes
 */
export const getAvailableRoutes = async (req: Request, res: Response) => {
  try {
    const routes = await prisma.route.findMany({
      where: { isActive: true },
      include: {
        originPark: true,
        destinationPark: true,
      },
      orderBy: { name: 'asc' },
    });

    return res.json({ routes });
  } catch (error) {
    console.error('Get available routes error:', error);
    return res.status(500).json({ error: 'Failed to fetch routes' });
  }
};

/**
 * Get Available Parks
 * GET /api/agent/parks
 */
export const getAvailableParks = async (req: Request, res: Response) => {
  try {
    const parks = await prisma.park.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return res.json({ parks });
  } catch (error) {
    console.error('Get available parks error:', error);
    return res.status(500).json({ error: 'Failed to fetch parks' });
  }
};

// ============================================
// WALLET & TRANSACTIONS
// ============================================

/**
 * Get Wallet Balance
 * GET /api/agent/wallet
 */
export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Fetch recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return res.json({
      balance: agent.walletBalance,
      recentTransactions,
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
};

/**
 * Top Up Passenger Wallet
 * POST /api/agent/wallet/topup
 */
export const topUpPassengerWallet = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { passengerId, amount, method } = req.body;

    // Validate input
    if (!passengerId || !amount || !method) {
      return res.status(400).json({
        error: 'Passenger ID, amount, and method are required',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify passenger exists
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const topUpAmount = Number(amount);
    const newBalance = passenger.walletBalance.add(topUpAmount);

    // Create top-up transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId: passenger.userId,
        userType: 'PASSENGER',
        type: 'CREDIT',
        category: 'WALLET_TOPUP',
        amount: topUpAmount,
        balanceBefore: passenger.walletBalance,
        balanceAfter: newBalance,
        status: 'SUCCESS',
        reference: `TOP-${Date.now()}`,
        description: `Wallet top-up via ${method} by agent ${agent.agentCode}`,
        metadata: { method, agentId: agent.id },
      },
    });

    // Update passenger wallet
    await prisma.passenger.update({
      where: { id: passengerId },
      data: {
        walletBalance: { increment: topUpAmount },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: passenger.userId },
      data: {
        walletBalance: { increment: topUpAmount },
      },
    });

    return res.json({
      message: 'Top-up successful',
      transaction,
      newBalance,
    });
  } catch (error) {
    console.error('Top up passenger wallet error:', error);
    return res.status(500).json({ error: 'Top-up failed' });
  }
};

/**
 * Withdraw Agent Earnings
 * POST /api/agent/wallet/withdraw
 */
export const withdrawEarnings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, bankAccountId, pin } = req.body;

    // Validate input
    if (!amount || !bankAccountId || !pin) {
      return res.status(400).json({
        error: 'Amount, bank account, and PIN are required',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify transaction PIN is set
    if (!agent.transactionPin) {
      return res.status(400).json({ 
        error: 'Please set up your transaction PIN first' 
      });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, agent.transactionPin);
    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const withdrawalAmount = Number(amount);

    // Check sufficient balance
    if (agent.walletBalance.lt(withdrawalAmount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Verify bank account belongs to agent
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const newBalance = agent.walletBalance.sub(withdrawalAmount);

    // Create withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        userType: 'AGENT',
        type: 'DEBIT',
        category: 'TRANSFER',
        amount: withdrawalAmount,
        balanceBefore: agent.walletBalance,
        balanceAfter: newBalance,
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

    // Update agent wallet
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        walletBalance: { decrement: withdrawalAmount },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: { decrement: withdrawalAmount },
      },
    });

    // TODO: Integrate with payment provider (Paystack, Flutterwave, etc.)
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
    console.error('Withdraw earnings error:', error);
    return res.status(500).json({ error: 'Withdrawal failed' });
  }
};

/**
 * Get Transaction History
 * GET /api/agent/transactions
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = '1', limit = '20', category, status } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (status) {
      where.status = status;
    }

    // Fetch transactions and total count
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
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
    console.error('Get transaction history error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

/**
 * Get Earnings Breakdown
 * GET /api/agent/earnings
 */
export const getEarningsBreakdown = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Aggregate earnings by category
    const [onboardingEarnings, commissionEarnings] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'WALLET_TOPUP',
          status: 'SUCCESS',
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          category: 'COMMISSION',
          status: 'SUCCESS',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalOnboardings = Number(onboardingEarnings._sum.amount || 0);
    const totalCommissions = Number(commissionEarnings._sum.amount || 0);

    return res.json({
      onboardings: totalOnboardings,
      commissions: totalCommissions,
      total: totalOnboardings + totalCommissions,
      withdrawable: agent.walletBalance,
    });
  } catch (error) {
    console.error('Get earnings breakdown error:', error);
    return res.status(500).json({ error: 'Failed to fetch earnings' });
  }
};

/**
 * Cash Out with Biometric
 * POST /api/agent/wallet/cashout
 */
export const cashOut = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { amount, biometricData } = req.body;

    // Validate input
    if (!amount || !biometricData) {
      return res.status(400).json({
        error: 'Amount and biometric data are required',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify biometric data
    // Note: In production, use proper biometric verification service
    if (agent.biometricData !== biometricData) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    const cashOutAmount = Number(amount);

    // Check sufficient balance
    if (agent.walletBalance.lt(cashOutAmount)) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = agent.walletBalance.sub(cashOutAmount);

    // Create cash-out transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        userType: 'AGENT',
        type: 'DEBIT',
        category: 'TRANSFER',
        amount: cashOutAmount,
        balanceBefore: agent.walletBalance,
        balanceAfter: newBalance,
        status: 'SUCCESS',
        reference: `CASH-${Date.now()}`,
        description: 'Cash withdrawal',
      },
    });

    // Update agent wallet
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        walletBalance: { decrement: cashOutAmount },
      },
    });

    // Update user wallet
    await prisma.user.update({
      where: { id: userId },
      data: {
        walletBalance: { decrement: cashOutAmount },
      },
    });

    return res.json({
      message: 'Cash out successful',
      transaction,
      printedReceipt: cashOutAmount,
    });
  } catch (error) {
    console.error('Cash out error:', error);
    return res.status(500).json({ error: 'Cash out failed' });
  }
};

// ============================================
// TRANSACTION PIN MANAGEMENT
// ============================================

/**
 * Set Transaction PIN
 * POST /api/agent/pin/set
 */
export const setTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pin, confirmPin } = req.body;

    // Validate input
    if (!pin || !confirmPin) {
      return res.status(400).json({ 
        error: 'PIN and confirmation are required' 
      });
    }

    // Verify PINs match
    if (pin !== confirmPin) {
      return res.status(400).json({ error: 'PINs do not match' });
    }

    // Validate PIN format (4 digits)
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4 digits' });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Hash and store PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    await prisma.agent.update({
      where: { id: agent.id },
      data: { transactionPin: hashedPin },
    });

    return res.json({ message: 'Transaction PIN set successfully' });
  } catch (error) {
    console.error('Set transaction PIN error:', error);
    return res.status(500).json({ error: 'Failed to set PIN' });
  }
};

/**
 * Verify Transaction PIN
 * POST /api/agent/pin/verify
 */
export const verifyTransactionPin = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Check if PIN is set
    if (!agent.transactionPin) {
      return res.status(400).json({ error: 'No PIN set' });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, agent.transactionPin);

    if (!isPinValid) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    return res.json({ 
      message: 'PIN verified successfully', 
      valid: true 
    });
  } catch (error) {
    console.error('Verify transaction PIN error:', error);
    return res.status(500).json({ error: 'PIN verification failed' });
  }
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Get Agent Profile
 * GET /api/agent/profile
 */
export const getAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const agent = await prisma.agent.findUnique({
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
        park: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      businessName: agent.businessName,
      email: agent.user.email,
      phoneNumber: agent.user.phoneNumber,
      agentCode: agent.agentCode,
      bvn: agent.bvn,
      nin: agent.nin,
      residentialAddress: agent.residentialAddress,
      state: agent.state,
      lga: agent.lga,
      terminalId: agent.terminalId,
      kycStatus: agent.kycStatus,
      isActive: agent.isActive,
      commissionRate: agent.commissionRate,
      walletBalance: agent.walletBalance,
      park: agent.park,
      createdAt: agent.createdAt,
    });
  } catch (error) {
    console.error('Get agent profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update Agent Profile
 * PUT /api/agent/profile
 */
export const updateAgentProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      firstName,
      lastName,
      businessName,
      residentialAddress,
      state,
      lga,
    } = req.body;

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Update agent profile
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

    return res.json({
      message: 'Profile updated successfully',
      agent: {
        id: updatedAgent.id,
        firstName: updatedAgent.firstName,
        lastName: updatedAgent.lastName,
        businessName: updatedAgent.businessName,
        residentialAddress: updatedAgent.residentialAddress,
        state: updatedAgent.state,
        lga: updatedAgent.lga,
      },
    });
  } catch (error) {
    console.error('Update agent profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ============================================
// SETTINGS & MANAGEMENT
// ============================================

/**
 * Get Assigned Park
 * GET /api/agent/park
 */
export const getAssignedPark = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    return res.json({
      assignedPark: agent.park,
    });
  } catch (error) {
    console.error('Get assigned park error:', error);
    return res.status(500).json({ error: 'Failed to fetch assigned park' });
  }
};

/**
 * Switch Park
 * POST /api/agent/park/switch
 */
export const switchPark = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { parkId } = req.body;

    if (!parkId) {
      return res.status(400).json({ error: 'Park ID is required' });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify park exists
    const park = await prisma.park.findUnique({
      where: { id: parkId },
    });

    if (!park) {
      return res.status(404).json({ error: 'Park not found' });
    }

    // Update agent's park
    await prisma.agent.update({
      where: { id: agent.id },
      data: { parkId },
    });

    return res.json({
      message: 'Park switched successfully',
      newPark: park,
    });
  } catch (error) {
    console.error('Switch park error:', error);
    return res.status(500).json({ error: 'Failed to switch park' });
  }
};

/**
 * Run Device Diagnostics
 * GET /api/agent/diagnostics
 */
export const runDeviceDiagnostics = async (req: Request, res: Response) => {
  try {
    // Simulate device health check
    const diagnostics = {
      systemHealth: 'Healthy',
      modules: {
        biometric: 'OK',
        printer: 'OK',
        network: 'OK',
        storage: 'OK',
      },
      timestamp: new Date(),
    };

    return res.json(diagnostics);
  } catch (error) {
    console.error('Run device diagnostics error:', error);
    return res.status(500).json({ error: 'Failed to run diagnostics' });
  }
};

// ============================================
// SUPPORT
// ============================================

/**
 * Get Support Contact
 * GET /api/agent/support/contact
 */
export const getSupportContact = async (req: Request, res: Response) => {
  try {
    return res.json({
      phone: '+234-800-TYAP-HELP',
      email: 'support@tyap.ng',
      workingHours: '24/7',
    });
  } catch (error) {
    console.error('Get support contact error:', error);
    return res.status(500).json({ error: 'Failed to fetch support contact' });
  }
};

/**
 * Submit Fault Report
 * POST /api/agent/support/report
 */
export const submitFaultReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { subject, message, category } = req.body;

    // Validate input
    if (!subject || !message) {
      return res.status(400).json({ 
        error: 'Subject and message are required' 
      });
    }

    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        message,
        category: category || 'TECHNICAL',
        status: 'OPEN',
        priority: 'NORMAL',
      },
    });

    return res.status(201).json({
      message: 'Fault report submitted successfully',
      ticket,
    });
  } catch (error) {
    console.error('Submit fault report error:', error);
    return res.status(500).json({ error: 'Failed to submit fault report' });
  }
};

/**
 * Get Agent Guide
 * GET /api/agent/guide
 */
export const getAgentGuide = async (req: Request, res: Response) => {
  try {
    const guides = await prisma.helpContent.findMany({
      where: {
        category: 'AGENT',
        isPublished: true,
      },
      orderBy: { order: 'asc' },
    });

    return res.json({ guides });
  } catch (error) {
    console.error('Get agent guide error:', error);
    return res.status(500).json({ error: 'Failed to fetch guide' });
  }
};