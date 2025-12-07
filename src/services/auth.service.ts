import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { createError } from '../middleware/error.middleware';
import { EmailService } from './email.service';
import { prisma } from '../config/database';

export class AuthService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async signup(data: { email: string; phoneNumber: string; password: string }) {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: data.email }, { phoneNumber: data.phoneNumber }] }
    });

    if (existingUser) {
      throw createError('User already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        passenger: { create: {} }
      },
      include: { passenger: true }
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

    const token = this.generateToken(user.id);
    
    return {
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
      token,
      message: 'Verification code sent to email'
    };
  }

  async login(data: { username: string; password: string }) {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: data.username }, { phoneNumber: data.username }] },
      include: { passenger: true }
    });
    
    // Use bcrypt.compare to check hashed password
    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      throw createError('Invalid credentials', 401);
    }

    const token = this.generateToken(user.id);
    
    return {
      user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
      token,
      isEmailVerified: user.isEmailVerified,
      hasTransactionPin: !!user.passenger?.transactionPin
    };
  }

  async verifyCode(userId: string, data: { code: string; type: string }) {
    const verification = await prisma.verificationCode.findFirst({
      where: {
        userId,
        code: data.code,
        type: data.type as any,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (!verification) {
      throw createError('Invalid or expired code', 400);
    }

    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { isUsed: true }
    });

    if (data.type === 'EMAIL_VERIFICATION') {
      await prisma.user.update({
        where: { id: userId },
        data: { isEmailVerified: true }
      });
    }

    return { message: 'Verification successful' };
  }

  async createTransactionPin(userId: string, pin: string) {
    const hashedPin = await bcrypt.hash(pin, 12);
    
    await prisma.passenger.update({
      where: { userId },
      data: { transactionPin: hashedPin }
    });
  }

  private generateToken(userId: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ userId }, secret, { expiresIn: '7d' } as any);
  }
}