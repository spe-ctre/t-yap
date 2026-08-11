import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import * as bcrypt from 'bcryptjs';
import { SessionService } from '../../identity/services/session.service';
import { smsService } from '../../identity/services/sms.service';

export class PMAuthService {
  static async login(phoneInput: string, email: string, password: string, deviceInfo: any) {
    // NOTE: preserved as-is from original — debug logging of phone/email on every attempt.
    console.log('PM Login Attempt:', { phoneInput, email, hasPassword: !!password });

    let formattedPhone = phoneInput ? phoneInput.trim() : '';
    let altPhone = formattedPhone;
    if (formattedPhone.startsWith('0')) {
      altPhone = '+234' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+234')) {
      altPhone = '0' + formattedPhone.substring(4);
    }

    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          ...(formattedPhone ? [{ phoneNumber: formattedPhone }, { phoneNumber: altPhone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
    });

    console.log('PM User found:', user ? { id: user.id, phone: user.phoneNumber, role: user.role } : null);

    if (!user) {
      throw createError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401);
    }

    const sessionService = new SessionService();
    const { token } = await sessionService.createSession(user.id, deviceInfo, user.role as any);

    // Fetch park manager profile separately
    const parkManager = await prisma.parkManager.findUnique({
      where: { userId: user.id },
      include: { park: true },
    });

    return {
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role,
        parkManager,
      },
    };
  }

  static async deviceSetup(deviceId: string) {
    const existingDevice = await prisma.userSession.findFirst({
      where: { deviceId },
    });

    if (existingDevice) {
      await prisma.userSession.update({
        where: { id: existingDevice.id },
        data: { lastActivity: new Date() },
      });
      return { alreadyRegistered: true };
    }

    return { alreadyRegistered: false };
  }

  static async sendRegistrationOTP(phoneNumber: string) {
    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser && existingUser.role === 'PARK_MANAGER') {
      throw createError('Park Manager already exists', 400);
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

    await smsService.sendVerificationSMS(phoneNumber, otpCode);

    return { phoneNumber };
  }

  static async verifyRegistrationOTP(phoneNumber: string, otp: string, deviceInfo: any) {
    const user = await prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) throw createError('User not found', 404);

    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: otp,
        type: 'PHONE_VERIFICATION',
        isUsed: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!verificationCode) throw createError('Invalid or expired OTP', 400);

    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { isUsed: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { isPhoneVerified: true },
    });

    const sessionService = new SessionService();
    const { token } = await sessionService.createSession(user.id, deviceInfo, user.role as any);

    return { token, userId: user.id };
  }

  static async completeProfile(
    userId: string,
    firstName: string,
    lastName: string,
    parkId: string,
    email?: string
  ) {
    const park = await prisma.park.findUnique({ where: { id: parkId } });
    if (!park) throw createError('Park not found', 404);

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

    return parkManager;
  }

  static async submitBiometric(userId: string, biometricData: string) {
    const parkManager = await prisma.parkManager.findUnique({ where: { userId } });
    if (!parkManager) throw createError('Park Manager not found', 404);

    await prisma.parkManager.update({
      where: { id: parkManager.id },
      data: { biometricData },
    });
  }
}