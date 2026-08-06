/// <reference path="../../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { prisma } from '../../../shared/config/database';
import { BiometricService } from '../../../identity/services/biometric.service';

export class BiometricDebugController {
  private biometricService: BiometricService;

  constructor() {
    this.biometricService = new BiometricService();
  }

  /**
   * Register a mock fingerprint for any user
   * POST /api/debug/biometric/register
   */
  registerMock = async (req: Request, res: Response) => {
    try {
      const { userId, template } = req.body;
      if (!userId || !template) {
        return res.status(400).json({ error: 'userId and template (string) required' });
      }

      const result = await this.biometricService.registerBiometric(userId, template);
      return res.json({ success: true, ...result });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  };

  /**
   * Simulate a 1:1 match
   * POST /api/debug/biometric/verify
   */
  verifyMock = async (req: Request, res: Response) => {
    try {
      const { userId, capturedTemplate } = req.body;
      const isMatch = await this.biometricService.verifyBiometric(userId, capturedTemplate);
      return res.json({ success: true, isMatch });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  };

  /**
   * Simulate 1:N identification
   * POST /api/debug/biometric/identify
   */
  identifyMock = async (req: Request, res: Response) => {
    try {
      const { capturedTemplate, userType } = req.body;
      const profile = await this.biometricService.identifyUser(capturedTemplate, userType || 'PASSENGER');
      return res.json({ success: true, identified: !!profile, profile });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ error: error.message });
    }
  };
}
