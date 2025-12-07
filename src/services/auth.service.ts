import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { VerificationType } from '@prisma/client';
import { createError } from '../middleware/error.middleware';
import { EmailService } from './email.service';
import { SessionService } from './session.service';
import { prisma } from '../config/database';

export class AuthService {
  private emailService: EmailService;
  private sessionService: SessionService;

  constructor() {
    this.emailService = new EmailService();
    this.sessionService = new SessionService();
  }

  async signup(data: { email: string; phoneNumber: string; password: string; role?: string }) {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }] }
    });

    if (existingUser) {
      throw createError('User already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const role = (data.role || 'PASSENGER') as any;
    
    // Create user with appropriate profile based on role
    const userData: any = {
      email: data.email,
      phoneNumber: data.phoneNumber,
      password: hashedPassword,
      role
    };

    // Create role-specific profile
    if (role === 'PASSENGER') {
      userData.passenger = { create: {} };
    } else if (role === 'DRIVER') {
      userData.driver = { create: { firstName: '', lastName: '', licenseNumber: '', licenseExpiry: new Date() } };
    } else if (role === 'AGENT') {
      userData.agent = { create: { firstName: '', lastName: '', agentCode: '' } };
    } else if (role === 'PARK_MANAGER') {
      userData.parkManager = { create: { firstName: '', lastName: '' } };
    }
    
    const user = await prisma.user.create({
      data: userData,
      include: { passenger: true, driver: true, agent: true, parkManager: true }
    });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: 'EMAIL_VERIFICATION',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    await this.emailService.sendVerificationEmail(user.email, verificationCode);
    
    // No session created - user must verify email first
    return {
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber, role: user.role },
      message: 'Verification code sent to email. Please verify your email to continue.'
    };
  }

  async login(data: { username: string; password: string; deviceName?: string; deviceType?: string; deviceId?: string; ipAddress?: string; userAgent?: string }) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: data.username }, { phoneNumber: data.username }] },
      include: { passenger: true }
    });
    
    // Use bcrypt.compare to check hashed password
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw createError('Invalid credentials', 401);
    }

    // Check if user is active (has at least email or phone verified)
    if (!user.isEmailVerified && !user.isPhoneVerified) {
      throw createError('Account not verified. Please verify your email or phone number to continue.', 403);
    }

    // Create session with device info
    const session = await this.sessionService.createSession(user.id, {
      deviceName: data.deviceName,
      deviceType: data.deviceType,
      deviceId: data.deviceId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent
    });
    
    return {
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
      token: session.token,
      isEmailVerified: user.isEmailVerified,
      hasTransactionPin: !!user.passenger?.transactionPin
    };
  }

  async verifyCode(data: { code: string; type: string; email?: string; phoneNumber?: string }) {
    // Find user by email or phone number
    if (!data.email && !data.phoneNumber) {
      throw createError('Email or phone number is required', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phoneNumber ? [{ phoneNumber: data.phoneNumber }] : [])
        ]
      }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify the code belongs to this user
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        type: data.type as any,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw createError('Invalid or expired code', 400);
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { isUsed: true }
    });

    // Update verification status
    let token: string | undefined;
    
    if (data.type === 'EMAIL_VERIFICATION') {
      await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true }
      });
      
      // Create session and return token after email verification
      const session = await this.sessionService.createSession(user.id, {
        deviceName: (data as any).deviceName,
        deviceType: (data as any).deviceType,
        deviceId: (data as any).deviceId,
        ipAddress: (data as any).ipAddress,
        userAgent: (data as any).userAgent
      });
      
      token = session.token;
    } else if (data.type === 'PHONE_VERIFICATION') {
      await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true }
      });
    }

    return { 
      message: 'Verification successful',
      ...(token && { token })
    };
  }

  async createTransactionPin(userId: string, pin: string) {
    const hashedPin = await bcrypt.hash(pin, 12);
    
    await prisma.passenger.update({
      where: { userId },
      data: { transactionPin: hashedPin }
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw createError('Current password is incorrect', 401);
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw createError('New password must be different from current password', 400);
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Send email notification (optional)
    await this.emailService.sendPasswordChangeNotification(user.email).catch(() => {
      // Ignore email errors
    });

    return { message: 'Password changed successfully' };
  }

  async updateTransactionPin(userId: string, currentPin: string, newPin: string) {
    const passenger = await prisma.passenger.findUnique({
      where: { userId }
    });

    if (!passenger) {
      throw createError('Passenger profile not found', 404);
    }

    if (!passenger.transactionPin) {
      throw createError('Transaction PIN not set. Please create a PIN first', 400);
    }

    // Verify current PIN
    const isPinValid = await bcrypt.compare(currentPin, passenger.transactionPin);
    if (!isPinValid) {
      throw createError('Current PIN is incorrect', 401);
    }

    // Check if new PIN is different
    const isSamePin = await bcrypt.compare(newPin, passenger.transactionPin);
    if (isSamePin) {
      throw createError('New PIN must be different from current PIN', 400);
    }

    // Hash and update PIN
    const hashedPin = await bcrypt.hash(newPin, 12);
    await prisma.passenger.update({
      where: { userId },
      data: { transactionPin: hashedPin }
    });

    return { message: 'Transaction PIN updated successfully' };
  }

  async verifyTransactionPin(userId: string, pin: string) {
    const passenger = await prisma.passenger.findUnique({
      where: { userId }
    });

    if (!passenger || !passenger.transactionPin) {
      throw createError('Transaction PIN not set', 404);
    }

    const isPinValid = await bcrypt.compare(pin, passenger.transactionPin);
    if (!isPinValid) {
      throw createError('Invalid PIN', 401);
    }

    return { message: 'PIN verified successfully' };
  }

  async resetTransactionPin(userId: string, code: string, newPin: string) {
    // Verify reset code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code,
        type: 'PIN_RESET' as VerificationType,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw createError('Invalid or expired reset code', 400);
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { isUsed: true }
    });

    // Update PIN
    const hashedPin = await bcrypt.hash(newPin, 12);
    await prisma.passenger.update({
      where: { userId },
      data: { transactionPin: hashedPin }
    });

    return { message: 'Transaction PIN reset successfully' };
  }

  async requestPinReset(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Invalidate all existing unused PIN_RESET codes
    await prisma.verificationCode.updateMany({
      where: {
        userId: user.id,
        type: 'PIN_RESET' as VerificationType,
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: resetCode,
        type: 'PIN_RESET' as VerificationType,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // Send email with reset code
    await this.emailService.sendPinResetEmail(user.email, resetCode);

    return { message: 'PIN reset code sent to email' };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account exists with this email, a password reset code has been sent' };
    }

    // Invalidate all existing unused PASSWORD_RESET codes
    await prisma.verificationCode.updateMany({
      where: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: resetCode,
        type: 'PASSWORD_RESET',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // Send email with reset code
    await this.emailService.sendPasswordResetEmail(user.email, resetCode);

    return { message: 'If an account exists with this email, a password reset code has been sent' };
  }

  async resetPassword(data: { email: string; code: string; newPassword: string }) {
    const user = await prisma.user.findFirst({
      where: { email: data.email }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Verify reset code
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        code: data.code,
        type: 'PASSWORD_RESET',
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw createError('Invalid or expired reset code', 400);
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { isUsed: true }
    });

    // Hash and update password
    const hashedPassword = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    // Invalidate all sessions for security
    await prisma.userSession.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false }
    });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  async resendVerificationCode(data: { email?: string; phoneNumber?: string; type: string }) {
    if (!data.email && !data.phoneNumber) {
      throw createError('Email or phone number is required', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phoneNumber ? [{ phoneNumber: data.phoneNumber }] : [])
        ]
      }
    });

    if (!user) {
      // Don't reveal if user exists for security
      return { message: 'If an account exists, a verification code has been sent' };
    }

    // Check if already verified
    if (data.type === 'EMAIL_VERIFICATION' && user.isEmailVerified) {
      throw createError('Email is already verified', 400);
    }
    if (data.type === 'PHONE_VERIFICATION' && user.isPhoneVerified) {
      throw createError('Phone number is already verified', 400);
    }

    // Invalidate all existing unused verification codes of the same type
    await prisma.verificationCode.updateMany({
      where: {
        userId: user.id,
        type: data.type as any,
        isUsed: false
      },
      data: {
        isUsed: true
      }
    });

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        code: verificationCode,
        type: data.type as any,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      }
    });

    // Send verification code
    if (data.type === 'EMAIL_VERIFICATION') {
      await this.emailService.sendVerificationEmail(user.email, verificationCode);
    }
    // TODO: Add SMS service for phone verification

    return { message: 'Verification code sent successfully' };
  }
}