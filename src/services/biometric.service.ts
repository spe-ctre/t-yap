import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { encryptBiometricData, decryptBiometricData, serializeEncryptedData, deserializeEncryptedData } from '../utils/encryption.util';

export class BiometricService {
  /**
   * Register biometric data for a user
   */
  async registerBiometric(userId: string, biometricToken: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    if (user.role !== 'PASSENGER') {
      throw createError('Biometric registration is only available for passengers', 400);
    }

    if (!user.passenger) {
      throw createError('Passenger profile not found', 404);
    }

    // Encrypt biometric token
    const encrypted = encryptBiometricData(biometricToken);
    const serialized = serializeEncryptedData(encrypted);

    // Store encrypted data
    await prisma.passenger.update({
      where: { userId },
      data: { biometricData: serialized }
    });

    return { message: 'Biometric data registered successfully' };
  }

  /**
   * Verify biometric token
   */
  async verifyBiometric(userId: string, biometricToken: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    if (!user || !user.passenger || !user.passenger.biometricData) {
      throw createError('Biometric data not registered', 404);
    }

    try {
      // Decrypt stored biometric data
      const encrypted = deserializeEncryptedData(user.passenger.biometricData);
      const storedToken = decryptBiometricData(encrypted);

      // Compare tokens (in production, use proper biometric matching algorithm)
      return storedToken === biometricToken;
    } catch (error) {
      throw createError('Failed to verify biometric data', 500);
    }
  }

  /**
   * Remove biometric data
   */
  async removeBiometric(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    if (!user || !user.passenger) {
      throw createError('Passenger profile not found', 404);
    }

    if (!user.passenger.biometricData) {
      throw createError('Biometric data not registered', 404);
    }

    await prisma.passenger.update({
      where: { userId },
      data: { biometricData: null }
    });

    return { message: 'Biometric data removed successfully' };
  }

  /**
   * Check if biometric is registered
   */
  async isBiometricRegistered(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true }
    });

    return !!(user?.passenger?.biometricData);
  }
}

