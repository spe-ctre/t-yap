import { prisma } from '../../shared/config/database';
import * as bcrypt from 'bcryptjs';
import { createError } from '../../shared/middleware/error.middleware';
import { getPaginationParams, buildPaginationMeta } from '../../shared/utils/pagination';
import { SMSService } from '../../identity/services/sms.service';
import { BiometricService } from '../../identity/services/biometric.service';
import { MonnifyService } from '../../wallet-money/services/monnify.service';
import { ProfileService } from '../../identity/services/profile.service';
import { SessionService } from '../../identity/services/session.service';
import { getCloudinary, isCloudinaryAvailable } from '../../shared/config/cloudinary';
import { dojahService } from '../../identity/services/dojah.service';

const smsService = new SMSService();
const biometricService = new BiometricService();
const monnifyService = new MonnifyService();
const profileService = new ProfileService();
const sessionService = new SessionService();

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

    // Previously this hand-built a string like `SESSION-<timestamp>-<userId>`,
    // which is not a JWT and has no matching UserSession row - authMiddleware
    // requires both a valid jwt.verify() pass AND a UserSession record with
    // that exact token, so the old value would fail every downstream
    // authenticated request (e.g. /auth/complete-profile) with "Invalid token".
    // createSession() issues a real signed JWT (userId + role) and persists
    // the matching UserSession row, same as identity/auth.service.ts login().
    const { token } = await sessionService.createSession(user.id, undefined, user.role as any);

    return { userId: user.id, token, nextStep: 'complete-profile' };
  }

  async completeAgentProfile(userId: string, body: any, file?: Express.Multer.File) {
    const {
      step,
      fullName,
      businessName,
      email,
      bvn,
      nin,
      documentType,
      documentNumber,
      residentialAddress,
      state,
      lga,
      parkId,
    } = body;

    if (!step) {
      throw createError('Step number is required', 400);
    }

    // Step 2 now optionally arrives as multipart/form-data (to carry the ID
    // document file alongside bvn/nin), which sends every field as a string
    // - e.g. step: "2" instead of step: 2. Steps 1 and 3 still arrive as
    // plain JSON with a real number. Coerce once here so every `=== ` check
    // below works regardless of which transport this request used.
    const stepNumber = Number(step);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createError('User not found', 404);
    }

    let agent = await prisma.agent.findUnique({ where: { userId } });

    if (stepNumber === 1) {
      // Figma step 1 collects a single "Full Legal Name" field plus a park
      // dropdown, not separate firstName/lastName - split the name here so
      // the rest of the app (Agent.firstName / Agent.lastName, both required
      // non-null columns) is unaffected.
      if (!fullName || !fullName.trim()) {
        throw createError('Full legal name is required', 400);
      }
      if (!parkId) {
        throw createError('Park is required', 400);
      }

      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length < 2) {
        throw createError('Please provide both first and last name', 400);
      }
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      // parkId now arrives a full step earlier than before (step 1, not
      // step 3) - validate it here using the same existence check switchPark
      // already uses elsewhere in this file, so a bogus/typo'd parkId fails
      // fast with a clear 404 instead of silently sitting on the agent row.
      const park = await prisma.park.findUnique({ where: { id: parkId } });
      if (!park) {
        throw createError('Park not found', 404);
      }

      if (agent) {
        agent = await prisma.agent.update({
          where: { id: agent.id },
          data: { firstName, lastName, businessName, parkId },
        });
      } else {
        const agentCode = `AGT-${Date.now().toString().slice(-6)}`;
        agent = await prisma.agent.create({
          data: {
            userId,
            firstName,
            lastName,
            businessName,
            parkId,
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

    if (stepNumber === 2) {
      if (!agent) {
        throw createError('Please complete step 1 first', 400);
      }
      if (!bvn && !nin) {
        throw createError('Either BVN or NIN is required', 400);
      }
      // Document upload is now mandatory here, not optional - this is the
      // only step that accepts a file at all, and a profile isn't actually
      // complete without a verifiable ID on record.
      if (!file) {
        throw createError('ID document image is required', 400);
      }
      if (!documentType) {
        throw createError('Document type is required', 400);
      }

      // Automated BVN/NIN verification via Dojah - full replacement for a
      // human manually eyeballing these numbers. A clear mismatch rejects
      // immediately (agent must correct and resubmit); an ambiguous result
      // (REVIEW) does NOT block progress - it just leaves kycStatus at its
      // default PENDING, which is exactly what the existing admin queue
      // (GET /api/admin/kyc-pending) already filters on, so ambiguous cases
      // still get a human fallback without any new admin code.
      const verificationLog: Record<string, any> = (agent as any).kycVerificationLog || {};
      let governmentPhotoBase64: string | undefined;

      if (bvn) {
        const bvnResult = await dojahService.verifyBvn(bvn, agent.firstName, agent.lastName);
        verificationLog.bvn = { ...bvnResult, checkedAt: new Date().toISOString() };
        if (bvnResult.status === 'REJECTED') {
          await prisma.agent.update({
            where: { id: agent.id },
            data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
          });
          throw createError(`BVN verification failed: ${bvnResult.reason}`, 400);
        }
        if (!governmentPhotoBase64 && bvnResult.governmentPhotoBase64) {
          governmentPhotoBase64 = bvnResult.governmentPhotoBase64;
        }
      }

      if (nin) {
        const ninResult = await dojahService.verifyNin(nin, agent.firstName, agent.lastName);
        verificationLog.nin = { ...ninResult, checkedAt: new Date().toISOString() };
        if (ninResult.status === 'REJECTED') {
          await prisma.agent.update({
            where: { id: agent.id },
            data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
          });
          throw createError(`NIN verification failed: ${ninResult.reason}`, 400);
        }
        // Prefer NIN's photo over BVN's if both happen to be present - NIN's
        // image field is the more consistently documented of the two.
        if (ninResult.governmentPhotoBase64) {
          governmentPhotoBase64 = ninResult.governmentPhotoBase64;
        }
      }

      // Document-to-record consistency check: compares the government's own
      // photo on file (returned free by the BVN/NIN calls above) against the
      // ID document image the agent is uploading right now. This replaces a
      // live-selfie liveness check, which isn't practical on the POS
      // hardware this flow actually runs on - it proves the uploaded ID
      // belongs to the same person as the BVN/NIN, not that a live human is
      // physically present.
      const idImageBase64 = file.buffer.toString('base64');
      if (governmentPhotoBase64) {
        const photoResult = await dojahService.verifyPhotoId(governmentPhotoBase64, idImageBase64);
        verificationLog.documentMatch = { ...photoResult, checkedAt: new Date().toISOString() };
        if (photoResult.status === 'REJECTED') {
          await prisma.agent.update({
            where: { id: agent.id },
            data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
          });
          throw createError(`ID document does not match BVN/NIN record: ${photoResult.reason}`, 400);
        }
      } else {
        // Neither BVN nor NIN returned a photo to compare against (BVN's
        // photo field is inconsistent across Dojah's own docs) - the
        // document still gets uploaded and stored below, but there's
        // nothing to auto-verify it against, so it rides along in the
        // existing manual admin queue like before.
        verificationLog.documentMatch = {
          status: 'REVIEW',
          reason: 'No government photo available from BVN/NIN response to cross-check against',
          checkedAt: new Date().toISOString(),
        };
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { bvn: bvn || agent.bvn, nin: nin || agent.nin, kycVerificationLog: verificationLog },
      });

      // ID document upload is bundled into this same step 2 call, matching
      // the Figma screen (BVN, NIN, and "Upload Valid ID" all on one screen).
      // The file arrives as a 'picture' field via the uploadSingle multer
      // middleware on this route. The legacy standalone
      // /auth/upload-document endpoint still exists untouched for now as a
      // fallback / until we decide whether to retire it.
      const documentUrl = await this.uploadDocumentFile(file, userId);

      const document = await prisma.document.create({
        data: { userId, documentType, url: documentUrl, documentNumber, status: 'PENDING' },
      });

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { idDocumentUrl: documentUrl },
      });

      return { agent, document, nextStep: 3 };
    }

    if (stepNumber === 3) {
      if (!agent) {
        throw createError('Please complete previous steps first', 400);
      }
      // parkId is no longer required/accepted here - it's collected in step 1
      // now, alongside name and business, matching the Figma flow.
      if (!residentialAddress || !state || !lga) {
        throw createError('All address fields are required', 400);
      }

      agent = await prisma.agent.update({
        where: { id: agent.id },
        data: { residentialAddress, state, lga },
      });

      return { agent, nextStep: 'submit-biometric' };
    }

    throw createError('Invalid step number', 400);
  }

  // Uploads a raw file buffer (from multer memory storage) to Cloudinary
  // and returns the hosted URL. Mirrors the pattern already used in
  // identity/services/kyc.service.ts's uploadFaceImage, so both file-upload
  // paths in the app behave consistently.
  private async uploadDocumentFile(file: Express.Multer.File, userId: string): Promise<string> {
    if (!isCloudinaryAvailable()) {
      throw createError('Document upload is not available. Cloudinary is not configured.', 503);
    }
    const cloudinary = getCloudinary();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tyap/agent/documents',
          public_id: `${userId}-${Date.now()}`,
          resource_type: 'image',
        },
        (error: any, result: any) => {
          if (error || !result) {
            reject(createError('Failed to upload document image', 500));
            return;
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });
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

    // Automated replacement for manual admin review: if every Dojah check
    // recorded in step 2 came back APPROVED (no REVIEW/REJECTED entries -
    // REJECTED would already have blocked the agent back in step 2), we
    // trust that result and approve here, on biometric completion, since
    // that's the natural end of onboarding. Any REVIEW result (ambiguous
    // name match, or Dojah itself erroring) leaves kycStatus at its default
    // PENDING, which the existing admin queue (GET /api/admin/kyc-pending,
    // PATCH /api/admin/kyc/:agentId/approve|reject) already picks up - so
    // the human fallback still works with zero new admin code.
    const verificationLog: Record<string, any> = (agent as any).kycVerificationLog || {};
    const checks = Object.values(verificationLog) as { status?: string }[];
    const allChecksPassed = checks.length > 0 && checks.every((c) => c.status === 'APPROVED');

    if (allChecksPassed) {
      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: { kycStatus: 'APPROVED', isActive: true },
      });
      return { status: updated.kycStatus, nextStep: 'dashboard' };
    }

    // No automated checks passed cleanly (or none ran, e.g. neither bvn nor
    // nin somehow reached step 2's checks) - stays PENDING, same as before.
    return { status: agent.kycStatus, nextStep: 'pending-review' };
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

  async getAgentAccountDetails(userId: string) {
    const agent = await prisma.agent.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            bankAccounts: true,
          },
        },
      },
    });
    if (!agent) {
      throw createError('Agent not found', 404);
    }

    const defaultAccount = agent.user.bankAccounts.find((b: any) => b.isDefault) || agent.user.bankAccounts[0];

    return {
      agentId: agent.id,
      agentCode: agent.agentCode,
      agentName: `${agent.firstName} ${agent.lastName}`,
      walletBalance: Number(agent.walletBalance),
      accountNumber: defaultAccount?.accountNumber || '9912388201',
      bankName: defaultAccount?.bankName || 'GTBank',
      accountName: defaultAccount?.accountName || `${agent.firstName} ${agent.lastName}`,
    };
  }

  async topUpPassengerWallet(userId: string, passengerId: string, amount: number, method: string) {
    if (!passengerId || !amount || !method) {
      throw createError('Passenger ID, amount, and method are required', 400);
    }

    const validMethods = ['CASH', 'TRANSFER'];
    const normalizedMethod = method.toUpperCase();
    if (!validMethods.includes(normalizedMethod)) {
      throw createError('Invalid payment method. Supported methods: CASH, TRANSFER', 400);
    }

    const amountToTransfer = Number(amount);
    if (isNaN(amountToTransfer) || amountToTransfer <= 0) {
      throw createError('Valid top-up amount is required', 400);
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

    const result = await prisma.$transaction(async (tx: any) => {
      const currentAgent = await tx.agent.findUnique({ where: { id: agent.id } });
      if (!currentAgent || currentAgent.walletBalance.lt(amountToTransfer)) {
        throw createError('Insufficient digital balance to perform this transfer.', 400);
      }

      const updatedAgent = await tx.agent.update({
        where: { id: agent.id },
        data: { walletBalance: { decrement: amountToTransfer } },
      });

      const currentTransportBalance = Number(passenger.transportWalletBalance || 0);

      // Fix 3 requirement: credit transportWalletBalance ONLY, NOT walletBalance
      const updatedPassenger = await tx.passenger.update({
        where: { id: passengerId },
        data: { transportWalletBalance: { increment: amountToTransfer } },
      });

      const agentTransaction = await tx.transaction.create({
        data: {
          userId: agent.userId,
          userType: 'AGENT',
          type: 'DEBIT',
          category: 'TRANSFER',
          amount: amountToTransfer,
          balanceBefore: Number(currentAgent.walletBalance),
          balanceAfter: Number(updatedAgent.walletBalance),
          status: 'SUCCESS',
          reference: `AGT-${normalizedMethod}-${Date.now()}`,
          description: `Passenger top-up (${normalizedMethod}) for ${passenger.user.phoneNumber}`,
          metadata: { passengerId, method: normalizedMethod },
        },
      });

      const passengerTransaction = await tx.transaction.create({
        data: {
          userId: passenger.userId,
          userType: 'PASSENGER',
          type: 'CREDIT',
          category: 'WALLET_TOPUP',
          amount: amountToTransfer,
          balanceBefore: currentTransportBalance,
          balanceAfter: Number(updatedPassenger.transportWalletBalance),
          status: 'SUCCESS',
          reference: `PAS-RCV-${Date.now()}`,
          description: `Transport wallet funded via ${normalizedMethod} by agent ${agent.agentCode}`,
          metadata: { agentId: agent.id, method: normalizedMethod },
        },
      });

      return { agentTransaction, passengerTransaction, updatedAgent, updatedPassenger };
    });

    return {
      success: true,
      message: `Top-up of ₦${amountToTransfer} successful via ${normalizedMethod}`,
      paymentMethod: normalizedMethod,
      amountTransferred: amountToTransfer,
      passengerNewTransportBalance: Number(result.updatedPassenger.transportWalletBalance),
      agentNewBalance: Number(result.updatedAgent.walletBalance),
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
    const { category, status } = query;
    const { page: pageNum, limit: limitNum, skip } = getPaginationParams(query);

    const where: any = { userId };
    if (category) where.category = category;
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limitNum }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: buildPaginationMeta(pageNum, limitNum, total),
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