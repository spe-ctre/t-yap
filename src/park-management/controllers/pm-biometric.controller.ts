/// <reference path="../../shared/types/express.d.ts" />
import { Request, Response } from 'express';
import { PMBiometricService } from '../services/pm-biometric.service';

export class PMBiometricController {
  static async enrollBiometric(req: Request, res: Response) {
    try {
      const { passengerId, templateData, deviceId } = req.body;
      if (!passengerId || !templateData) return res.status(400).json({ error: 'passengerId and templateData are required' });

      const biometricId = await PMBiometricService.enrollBiometric(passengerId, templateData, deviceId);

      return res.json({ success: true, message: 'Fingerprint enrolled successfully', biometricId });
    } catch (error) {
      console.error('Enroll biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll biometric' });
    }
  }

  static async verifyBiometric(req: Request, res: Response) {
    try {
      const { templateData } = req.body;
      if (!templateData) return res.status(400).json({ error: 'templateData is required' });

      const passenger = await PMBiometricService.verifyBiometric(templateData);

      if (!passenger) {
        return res.json({
          success: true,
          verified: false,
          message: 'No matching fingerprint found',
        });
      }

      return res.json({
        success: true,
        verified: true,
        matchScore: 100, // Placeholder score
        passenger,
      });
    } catch (error) {
      console.error('Verify biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify biometric' });
    }
  }

  static async driverCheckIn(req: Request, res: Response) {
    try {
      const { templateData, deviceId } = req.body;
      if (!templateData) return res.status(400).json({ error: 'templateData is required' });

      const result = await PMBiometricService.driverCheckIn(templateData, deviceId);

      if (!result) {
        return res.json({
          success: true,
          verified: false,
          message: 'No matching driver fingerprint found',
        });
      }

      return res.json({
        success: true,
        verified: true,
        driver: result.driver,
        token: result.token,
        message: 'Driver checked in successfully',
      });
    } catch (error) {
      console.error('Driver check-in error:', error);
      return res.status(500).json({ error: 'Failed to process driver check-in' });
    }
  }

  static async enrollDriverBiometric(req: Request, res: Response) {
    try {
      const { driverId, templateData } = req.body;
      if (!driverId || !templateData) return res.status(400).json({ error: 'driverId and templateData are required' });

      const biometricId = await PMBiometricService.enrollDriverBiometric(driverId, templateData);
      return res.json({ success: true, message: 'Driver fingerprint enrolled successfully', biometricId });
    } catch (error: any) {
      console.error('Enroll driver biometric error:', error);
      return res.status(error.message === 'Driver not found' ? 404 : 500).json({ error: error.message || 'Failed to enroll driver biometric' });
    }
  }

  static async enrollAgentBiometric(req: Request, res: Response) {
    try {
      const { agentId, templateData } = req.body;
      if (!agentId || !templateData) return res.status(400).json({ error: 'agentId and templateData are required' });

      const biometricId = await PMBiometricService.enrollAgentBiometric(agentId, templateData);
      return res.json({ success: true, message: 'Agent fingerprint enrolled successfully', biometricId });
    } catch (error: any) {
      console.error('Enroll agent biometric error:', error);
      return res.status(error.message === 'Agent not found' ? 404 : 500).json({ error: error.message || 'Failed to enroll agent biometric' });
    }
  }

  static async verifyAgentBiometric(req: Request, res: Response) {
    try {
      const { templateData } = req.body;
      if (!templateData) return res.status(400).json({ error: 'templateData is required' });

      const result = await PMBiometricService.verifyAgentBiometric(templateData);

      if (!result.verified) {
        return res.json({ success: true, verified: false, message: result.message });
      }

      return res.json({
        success: true,
        verified: true,
        agent: result.agent,
        message: 'Agent verified successfully',
      });
    } catch (error) {
      console.error('Verify agent biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify agent biometric' });
    }
  }

  static async enrollOwnBiometric(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { templateData } = req.body;
      const biometricId = await PMBiometricService.enrollOwnBiometric(userId, templateData);
      return res.json({ success: true, message: 'Biometric enrolled successfully', biometricId });
    } catch (error) {
      console.error('Enroll own biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll own biometric' });
    }
  }

  static async verifyOwnBiometric(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const verified = await PMBiometricService.verifyOwnBiometric(userId);
      return res.json({ success: true, verified });
    } catch (error) {
      console.error('Verify own biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify biometric' });
    }
  }
}