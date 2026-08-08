/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMAuthService } from '../services/pm-auth.service';

const handleError = (res: Response, error: any, fallbackMessage: string) => {
  console.error(fallbackMessage + ':', error);
  const statusCode = error.statusCode || 500;
  return res.status(statusCode).json({ error: error.message || fallbackMessage });
};

export class PMAuthController {
  static async login(req: Request, res: Response) {
    try {
      const { phone, phoneNumber, password, email } = req.body;
      const phoneInput = phone || phoneNumber;

      if ((!phoneInput && !email) || !password) {
        return res.status(400).json({ error: 'Phone number/email and password are required' });
      }

      const result = await PMAuthService.login(phoneInput, email, password, req.deviceInfo);

      return res.json({ message: 'Login successful', ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to log in');
    }
  }

  static async deviceSetup(req: Request, res: Response) {
    try {
      const { deviceId } = req.body;
      if (!deviceId) return res.status(400).json({ error: 'Device ID is required' });

      const { alreadyRegistered } = await PMAuthService.deviceSetup(deviceId);

      if (alreadyRegistered) {
        return res.json({ message: 'Device already registered' });
      }

      return res.json({ message: 'Device initialized successfully', deviceId });
    } catch (error: any) {
      return handleError(res, error, 'Failed to initialize device');
    }
  }

  static async sendRegistrationOTP(req: Request, res: Response) {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

      const otpCode = await PMAuthService.sendRegistrationOTP(phoneNumber);

      return res.json({ message: 'OTP sent successfully', phoneNumber, otp: otpCode });
    } catch (error: any) {
      return handleError(res, error, 'Failed to send OTP');
    }
  }

  static async verifyRegistrationOTP(req: Request, res: Response) {
    try {
      const { phone, phoneNumber: phoneNumberBody, otp } = req.body;
      const phoneNumber = phone || phoneNumberBody;
      if (!phoneNumber || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

      const result = await PMAuthService.verifyRegistrationOTP(phoneNumber, otp, req.deviceInfo);

      return res.json({ message: 'Phone verified successfully', ...result });
    } catch (error: any) {
      return handleError(res, error, 'Failed to verify OTP');
    }
  }

  static async completeProfile(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, parkId, email } = req.body;

      if (!firstName || !lastName || !parkId) {
        return res.status(400).json({ error: 'First name, last name, and park required' });
      }

      const parkManager = await PMAuthService.completeProfile(userId, firstName, lastName, parkId, email);

      return res.json({ message: 'Profile completed successfully', parkManager });
    } catch (error: any) {
      return handleError(res, error, 'Failed to complete profile');
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

      await PMAuthService.submitBiometric(userId, biometricData);

      return res.json({ message: 'Registration completed successfully' });
    } catch (error: any) {
      return handleError(res, error, 'Failed to submit biometric');
    }
  }
}