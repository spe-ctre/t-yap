import { Request, Response } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { SMSService } from '../services/sms.service';
import { BiometricService } from '../services/biometric.service';

const smsService = new SMSService();
const biometricService = new BiometricService();

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

    await smsService.sendVerificationSMS(phoneNumber, otpCode);
    return res.json({
      message: 'OTP sent successfully',
      phoneNumber,
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
    await biometricService.registerBiometric(userId, biometricData);

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
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
        agentId: agent.id, // Link to the onboarding agent
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
    const { biometricData, deviceId } = req.body;
    const agentId = req.user?.id;

    if (!biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    // Verify agent is authorized
    const agent = await prisma.agent.findUnique({ where: { userId: agentId } });
    if (!agent) return res.status(403).json({ error: 'Unauthorized: Only agents can capture biometrics' });

    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    // Use BiometricService for encryption and storage
    await biometricService.registerBiometric(passenger.userId, biometricData);

    // Optional: Keep legacy indexing if needed for other services
    await prisma.biometricData.create({
      data: {
        userId: passenger.userId,
        userType: 'PASSENGER',
        templateData: biometricData, // Note: This remains unencrypted for legacy search if needed
        deviceId: deviceId || null,
      },
    });

    return res.json({
      message: 'Biometric captured and indexed successfully',
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

    // Verify agent exists and get their park
    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: { park: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (!agent.park) {
      return res.status(400).json({ error: 'Agent is not assigned to a park. Cannot activate wallet.' });
    }

    // Verify passenger exists
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { user: true },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const park = agent.park as any;
    const activationAmount = Number(park.onboardingPrice || 500);
    const commissionRate = Number(agent.commissionRate || 20); // Default 20% commission for onboarding
    const agentCommission = (activationAmount * commissionRate) / 100;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update passenger tier
      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: {
          tier: 'TIER_1',
        },
      });

      // 2. Activation is implicit via Tier 1 setting
      // (User.isActive does not exist in schema)

      // 3. Create activation transaction (for record keeping)
      const passengerTransaction = await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'CREDIT',
          category: 'WALLET_TOPUP',
          amount: 0, // Onboarding fee doesn't fund the wallet by default unless specified
          balanceBefore: passenger.walletBalance,
          balanceAfter: passenger.walletBalance,
          status: 'SUCCESS',
          reference: `ACT-${Date.now()}`,
          description: `Account activated at ${agent.park?.name}`,
        },
      });

      // 3. Update agent wallet with commission
      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: {
          walletBalance: { increment: agentCommission },
        },
      });

      // 4. Create commission transaction for agent
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

    return res.json({
      message: 'Wallet activated successfully',
      park: agent.park.name,
      onboardingPrice: activationAmount,
      agentCommission: result.agentCommission,
      passengerTier: result.updatedPassenger.tier,
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
    const agentUserId = req.user?.id;
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
      // Keep others optional for full API compatibility but not required by UI
      licenseNumber = `DRV-${Date.now()}`, 
      licenseExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      vehicleMake = 'Generic',
      vehicleModel = 'Transport',
    } = req.body;

    // Validate UI-required fields
    if (!firstName || !lastName || !phoneNumber || !plateNumber || !seatCapacity) {
      return res.status(400).json({
        error: 'Required fields missing: Name, Phone, Plate, and Capacity are mandatory',
      });
    }

    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { userId: agentUserId },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Wrap everything in a transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or find user for driver
      let user = await tx.user.findUnique({
        where: { phoneNumber },
      });

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
        // Check if user is already a driver
        const existingDriver = await tx.driver.findUnique({
          where: { userId: user.id },
        });
        if (existingDriver) {
          throw new Error('This user is already registered as a driver');
        }
      }

      // 2. Create driver record
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

      // 3. Create vehicle record
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

      // 4. Create bank account if provided
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

    return res.status(201).json({
      message: 'Driver and vehicle created successfully',
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
    });
  } catch (error: any) {
    console.error('Create driver error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create driver' });
  }
};

/**
 * Capture Driver Biometric
 * POST /api/agent/drivers/:driverId/biometric
 */
export const captureDriverBiometric = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { biometricData, deviceId } = req.body;
    const agentUserId = req.user?.id;

    if (!biometricData) {
      return res.status(400).json({ error: 'Biometric data is required' });
    }

    // Verify agent is authorized
    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) return res.status(403).json({ error: 'Unauthorized: Only agents can capture biometrics' });

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Use transaction to update both places
    await prisma.$transaction(async (tx) => {
      // 1. Update Driver profile (for 1:1 app login)
      await tx.driver.update({
        where: { id: driverId },
        data: { biometricData },
      });

      // 2. Create BiometricData record (for 1:N POS identification)
      await tx.biometricData.create({
        data: {
          userId: driverId,
          userType: 'DRIVER',
          templateData: biometricData,
          deviceId: deviceId || null,
        },
      });
    });

    return res.json({
      message: 'Driver biometric captured and indexed successfully',
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
    const agentUserId = req.user?.id;

    // Verify agent is authorized
    const agent = await prisma.agent.findUnique({ where: { userId: agentUserId } });
    if (!agent) return res.status(403).json({ error: 'Unauthorized: Only agents can verify drivers' });

    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Ensure biometrics are captured before verification
    if (!driver.biometricData) {
      return res.status(400).json({ 
        error: 'Cannot verify driver: Biometric data must be captured first' 
      });
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

    // Verify passenger exists and include user for phone number
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: { user: true },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const amountToTransfer = Number(amount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify agent has sufficient digital balance to transfer
      const currentAgent = await tx.agent.findUnique({ where: { id: agent.id } });
      if (!currentAgent || currentAgent.walletBalance.lt(amountToTransfer)) {
        throw new Error('Insufficient digital balance to perform this transfer.');
      }

      // 2. Debit Agent's digital wallet
      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: {
          walletBalance: { decrement: amountToTransfer },
        },
      });

      // 3. Credit Passenger's digital wallet
      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: {
          walletBalance: { increment: amountToTransfer },
        },
      });

      // 4. Record Agent's transfer (Debit)
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

      // 5. Record Passenger's receipt (Credit)
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

    return res.json({
      message: 'Transfer successful',
      amountTransferred: amountToTransfer,
      passengerNewBalance: result.updatedPassenger.walletBalance,
      agentNewBalance: result.updatedAgent.walletBalance,
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

    // Verify bank account belongs to agent
    const bankAccount = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount || bankAccount.userId !== userId) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update agent wallet (decrement)
      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: {
          walletBalance: { decrement: withdrawalAmount },
        },
      });

      // 2. Create withdrawal transaction record (status: PROCESSING)
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

    // TODO: Integrate with payment provider (Ethica MFB / Monnify)
    // For now, we simulate a successful disbursement
    try {
      // Simulation of external API call
      // const disbursementResult = await monnifyService.initiateTransfer(...)
      
      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { status: 'SUCCESS' },
      });

      return res.json({
        message: 'Withdrawal processed successfully',
        transaction: result.transaction,
        newBalance: result.updatedAgent.walletBalance,
      });
    } catch (apiError) {
      // Rollback logic if API fails (optional, or mark as FAILED)
      await prisma.transaction.update({
        where: { id: result.transaction.id },
        data: { status: 'FAILED' },
      });
      return res.status(500).json({ error: 'Disbursement failed. Funds will be reversed.' });
    }
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

    // 1. Calculate Today's Earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.transaction.aggregate({
      where: {
        userId,
        category: 'COMMISSION',
        status: 'SUCCESS',
        createdAt: { gte: today },
      },
      _sum: { amount: true },
    });

    // 2. Calculate Today's Onboarded Count (Filtered by this specific agent)
    const onboardedToday = await prisma.passenger.count({
      where: {
        agentId: agent.id,
        createdAt: { gte: today },
      },
    });

    // 3. Aggregate Onboarding Earnings
    const onboardingStats = await prisma.transaction.aggregate({
      where: {
        userId,
        category: 'COMMISSION',
        description: { contains: 'activation' },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    // 4. Aggregate Top-up Commission Earnings
    const commissionStats = await prisma.transaction.aggregate({
      where: {
        userId,
        category: 'COMMISSION',
        description: { contains: 'top-up' },
        status: 'SUCCESS',
      },
      _sum: { amount: true },
    });

    const onboardingTotal = Number(onboardingStats._sum.amount || 0);
    const commissionTotal = Number(commissionStats._sum.amount || 0);
    const todayEarnings = Number(todayStats._sum.amount || 0);

    const recentActivities = await prisma.passenger.findMany({
      where: { agentId: agent.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      }
    });

    return res.json({
      todayEarnings,
      onboardedToday,
      totalEarnings: onboardingTotal + commissionTotal,
      withdrawableBalance: agent.walletBalance,
      breakdown: {
        onboarding: onboardingTotal,
        commissions: commissionTotal,
        referrals: 0,
      },
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        title: `Onboarded ${a.firstName} ${a.lastName}`,
        time: a.createdAt,
      }))
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

    // 1. Verify biometric data using the unified service
    const isVerified = await biometricService.verifyBiometric(userId, biometricData);
    const cashOutAmount = Number(amount);

    if (!isVerified) {
      return res.status(401).json({ error: 'Biometric verification failed' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Check sufficient balance
      const currentAgent = await tx.agent.findUnique({ where: { userId } });
      if (!currentAgent || currentAgent.walletBalance.lt(cashOutAmount)) {
        throw new Error('Insufficient balance');
      }

      const newBalance = currentAgent.walletBalance.sub(cashOutAmount);

      // 3. Update agent wallet
      const updatedAgent = await tx.agent.update({
        where: { id: currentAgent.id },
        data: {
          walletBalance: { decrement: cashOutAmount },
        },
      });

      // 4. Create cash-out transaction record
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

    return res.json({
      message: 'Cash out successful',
      transaction: result.transaction,
      newBalance: result.updatedAgent.walletBalance,
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