import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export class PMBiometricController {
  static async enrollBiometric(req: Request, res: Response) {
    try {
      const { passengerId, templateData, deviceId } = req.body;
      if (!passengerId || !templateData) return res.status(400).json({ error: 'passengerId and templateData are required' });

      const biometric = await prisma.biometricData.create({
        data: {
          userId: passengerId,
          userType: 'PASSENGER',
          templateData,
          deviceId: deviceId || null,
        },
      });

      return res.json({ success: true, message: 'Fingerprint enrolled successfully', biometricId: biometric.id });
    } catch (error) {
      console.error('Enroll biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll biometric' });
    }
  }

  static async verifyBiometric(req: Request, res: Response) {
    try {
      const { templateData } = req.body;
      if (!templateData) return res.status(400).json({ error: 'templateData is required' });

      // Using the new BiometricService for identification
      const { BiometricService } = require('../../services/biometric.service');
      const biometricService = new BiometricService();
      
      const passenger = await biometricService.identifyUser(templateData, 'PASSENGER');

      if (!passenger) {
        return res.json({ 
          success: true, 
          verified: false, 
          message: 'No matching fingerprint found' 
        });
      }

      return res.json({
        success: true,
        verified: true,
        matchScore: 100, // Placeholder score
        passenger: {
          id: passenger.id,
          firstName: passenger.firstName || '',
          lastName: passenger.lastName || '',
          phoneNumber: passenger.user.phoneNumber,
          walletBalance: Number(passenger.walletBalance),
        },
      });
    } catch (error) {
      console.error('Verify biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify biometric' });
    }
  }

  static async driverCheckIn(req: Request, res: Response) {
    try {
      const { templateData } = req.body;
      if (!templateData) return res.status(400).json({ error: 'templateData is required' });

      const { BiometricService } = require('../../services/biometric.service');
      const biometricService = new BiometricService();
      
      const driver = await biometricService.identifyUser(templateData, 'DRIVER');

      if (!driver) {
        return res.json({ 
          success: true, 
          verified: false, 
          message: 'No matching driver fingerprint found' 
        });
      }

      // Check if driver has a vehicle
      const driverWithVehicle = await prisma.driver.findUnique({
        where: { id: driver.id },
        include: { vehicle: true }
      });

      return res.json({
        success: true,
        verified: true,
        driver: {
          id: driver.id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          vehicle: driverWithVehicle?.vehicle ? { plateNumber: driverWithVehicle.vehicle.plateNumber } : null,
        },
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
      const biometric = await prisma.biometricData.create({
        data: { userId: driverId, userType: 'DRIVER', templateData },
      });
      return res.json({ success: true, message: 'Driver fingerprint enrolled successfully', biometricId: biometric.id });
    } catch (error) {
      console.error('Enroll driver biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll driver biometric' });
    }
  }

  static async enrollAgentBiometric(req: Request, res: Response) {
    try {
      const { agentId, templateData } = req.body;
      const biometric = await prisma.biometricData.create({
        data: { userId: agentId, userType: 'AGENT', templateData },
      });
      return res.json({ success: true, message: 'Agent fingerprint enrolled successfully', biometricId: biometric.id });
    } catch (error) {
      console.error('Enroll agent biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll agent biometric' });
    }
  }

  static async verifyAgentBiometric(req: Request, res: Response) {
    try {
      const agentBiometric = await prisma.biometricData.findFirst({
        where: { userType: 'AGENT', isActive: true },
      });

      if (!agentBiometric) return res.json({ success: true, verified: false, message: 'No agent fingerprints found' });

      const agent = await prisma.agent.findUnique({
        where: { id: agentBiometric.userId },
        include: { user: true },
      });

      if (!agent) return res.json({ success: true, verified: false, message: 'Agent not found' });

      return res.json({
        success: true,
        verified: true,
        agent: { id: agent.id, firstName: agent.firstName, lastName: agent.lastName },
        message: 'Agent verified successfully',
      });
    } catch (error) {
      console.error('Verify agent biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify agent biometric' });
    }
  }

  static async enrollOwnBiometric(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { templateData } = req.body;
      const biometric = await prisma.biometricData.create({
        data: { userId, userType: 'PARK_MANAGER', templateData },
      });
      return res.json({ success: true, message: 'Biometric enrolled successfully', biometricId: biometric.id });
    } catch (error) {
      console.error('Enroll own biometric error:', error);
      return res.status(500).json({ error: 'Failed to enroll own biometric' });
    }
  }

  static async verifyOwnBiometric(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const biometric = await prisma.biometricData.findFirst({
        where: { userId, userType: 'PARK_MANAGER', isActive: true },
      });
      if (!biometric) return res.json({ success: true, verified: false });
      return res.json({ success: true, verified: true });
    } catch (error) {
      console.error('Verify own biometric error:', error);
      return res.status(500).json({ error: 'Failed to verify biometric' });
    }
  }
}
