import { prisma } from '../../shared/config/database';

export class PMBiometricService {
  static async enrollBiometric(passengerId: string, templateData: string, deviceId?: string) {
    const biometric = await prisma.biometricData.create({
      data: {
        userId: passengerId,
        userType: 'PASSENGER',
        templateData,
        deviceId: deviceId || null,
      },
    });

    return biometric.id;
  }

  static async verifyBiometric(templateData: string) {
    // Using the new BiometricService for identification
    const { BiometricService } = require('../../identity/services/biometric.service');
    const biometricService = new BiometricService();

    const passenger = await biometricService.identifyUser(templateData, 'PASSENGER');

    if (!passenger) return null;

    return {
      id: passenger.id,
      firstName: passenger.firstName || '',
      lastName: passenger.lastName || '',
      phoneNumber: passenger.user.phoneNumber,
      walletBalance: Number(passenger.walletBalance),
    };
  }

  static async driverCheckIn(templateData: string, deviceId?: string) {
    const { BiometricService } = require('../../identity/services/biometric.service');
    const biometricService = new BiometricService();

    const driver = await biometricService.identifyUser(templateData, 'DRIVER');

    if (!driver) return null;

    // Check if driver has a vehicle
    const driverWithVehicle = await prisma.driver.findUnique({
      where: { id: driver.id },
      include: { vehicle: true },
    });

    // Issue a real, driver-scoped session token on successful match - same
    // convention as a normal login (SessionService.createSession), so the
    // POS device can use this token as Authorization: Bearer for the rest
    // of the driver's shift (start shift, dashboard, etc. under /api/driver/*).
    // Without this, a successful fingerprint match had no way to actually
    // authenticate as that driver for any subsequent action.
    const { SessionService } = require('../../identity/services/session.service');
    const sessionService = new SessionService();
    const { token } = await sessionService.createSession(
      driver.userId,
      { deviceId: deviceId || undefined, deviceType: 'POS' },
      'DRIVER'
    );

    return {
      driver: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        vehicle: driverWithVehicle?.vehicle ? { plateNumber: driverWithVehicle.vehicle.plateNumber } : null,
      },
      token,
    };
  }

  static async enrollDriverBiometric(driverId: string, templateData: string) {
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) throw new Error('Driver not found');

    const biometric = await prisma.biometricData.create({
      data: { userId: driverId, userType: 'DRIVER', templateData },
    });
    return biometric.id;
  }

  static async enrollAgentBiometric(agentId: string, templateData: string) {
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    const biometric = await prisma.biometricData.create({
      data: { userId: agentId, userType: 'AGENT', templateData },
    });
    return biometric.id;
  }

  static async verifyAgentBiometric(templateData: string) {
    const { BiometricService } = require('../../identity/services/biometric.service');
    const biometricService = new BiometricService();

    const agent = await biometricService.identifyUser(templateData, 'AGENT');

    if (!agent) {
      return { verified: false, message: 'No matching agent fingerprint found' } as const;
    }

    return {
      verified: true,
      agent: { id: agent.id, firstName: agent.firstName, lastName: agent.lastName },
    } as const;
  }

  static async enrollOwnBiometric(userId: string, templateData: string) {
    const biometric = await prisma.biometricData.create({
      data: { userId, userType: 'PARK_MANAGER', templateData },
    });
    return biometric.id;
  }

  static async verifyOwnBiometric(userId: string) {
    const biometric = await prisma.biometricData.findFirst({
      where: { userId, userType: 'PARK_MANAGER', isActive: true },
    });
    return !!biometric;
  }
}