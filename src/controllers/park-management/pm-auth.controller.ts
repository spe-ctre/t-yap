/// <reference path="../../types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import * as bcrypt from 'bcryptjs';

export class PMAuthController {
  static async deviceSetup(req: Request, res: Response) {
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
  }

  static async sendRegistrationOTP(req: Request, res: Response) {
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
  }

  static async verifyRegistrationOTP(req: Request, res: Response) {
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
  }

  static async completeProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
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
  }

  static async uploadDocument(req: Request, res: Response) {
    try {
      const { documentType, documentUrl } = req.body;
      if (!documentType || !documentUrl) {
        return res.status(400).json({ error: 'Document type and URL required' });
      }
      return res.json({ message: 'Document uploaded successfully' });
    } catch (error) {
      console.error('Upload document error:', error);
      return res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  static async submitBiometric(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
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
  }
}
