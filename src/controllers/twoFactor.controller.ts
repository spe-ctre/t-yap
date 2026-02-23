import { Request, Response, NextFunction } from 'express';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class TwoFactorController {

  // Step 1 — Generate a secret and QR code for the admin to scan
  setup2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw createError('User not found', 404);

      // Generate a new secret
      const secret = speakeasy.generateSecret({
        name: `T-YAP Admin (${user.email})`,
        issuer: 'T-YAP'
      });

      // Save the secret to the database (not enabled yet — user must verify first)
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret.base32 }
      });

      // Generate QR code image as a data URL
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      res.json({
        success: true,
        statusCode: 200,
        data: {
          qrCode: qrCodeUrl,
          secret: secret.base32 // shown as backup code
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // Step 2 — Verify the code from Google Authenticator and enable 2FA
  verify2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { code } = req.body;

      if (!code) throw createError('Verification code is required', 400);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.twoFactorSecret) throw createError('2FA setup not initiated', 400);

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!isValid) throw createError('Invalid verification code', 400);

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: true }
      });

      res.json({ success: true, statusCode: 200, message: '2FA enabled successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Step 3 — Validate 2FA code on login
  validate2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) throw createError('User ID and code are required', 400);

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.twoFactorSecret) throw createError('2FA not set up for this user', 400);

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!isValid) throw createError('Invalid 2FA code', 401);

      res.json({ success: true, statusCode: 200, message: '2FA validated successfully' });
    } catch (error) {
      next(error);
    }
  };

  // Disable 2FA
  disable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;

      await prisma.user.update({
        where: { id: userId },
        data: { isTwoFactorEnabled: false, twoFactorSecret: null }
      });

      res.json({ success: true, statusCode: 200, message: '2FA disabled successfully' });
    } catch (error) {
      next(error);
    }
  };
}