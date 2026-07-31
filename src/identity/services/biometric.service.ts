import axios from 'axios';
import { prisma } from '../../shared/config/database';
import { createError } from '../../shared/middleware/error.middleware';
import { encryptBiometricData, decryptBiometricData, serializeEncryptedData, deserializeEncryptedData } from '../../shared/utils/encryption.util';

const BIOMETRIC_SERVICE_URL = process.env.BIOMETRIC_SERVICE_URL || 'http://localhost:8080';
const MATCH_THRESHOLD = 60;

export class BiometricService {
  /**
   * Internal helper to call the Java Matching Service
   */
  private async callMatchingService(endpoint: string, data: any) {
    try {
      const response = await axios.post(`${BIOMETRIC_SERVICE_URL}${endpoint}`, data, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000, // 10 seconds for 1:N matching
      });
      return response.data;
    } catch (error: any) {
      console.error(`Biometric Service Error (${endpoint}):`, error.message);
      if (process.env.NODE_ENV === 'production') {
        throw createError('Biometric matching service unavailable', 503);
      }
      return null;
    }
  }

  /**
   * Register biometric data for a user
   */
  async registerBiometric(userId: string, biometricToken: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true }
    });

    if (!user) {
      throw createError('User not found', 404);
    }

    // Encrypt biometric token (Reference Template: 512 bytes)
    const encrypted = encryptBiometricData(biometricToken);
    const serialized = serializeEncryptedData(encrypted);

    // Store based on role
    if (user.role === 'PASSENGER') {
      await prisma.passenger.update({ where: { userId }, data: { biometricData: serialized } });
    } else if (user.role === 'DRIVER') {
      await prisma.driver.update({ where: { userId }, data: { biometricData: serialized } });
    } else if (user.role === 'AGENT') {
      await prisma.agent.update({ where: { userId }, data: { biometricData: serialized } });
    } else if (user.role === 'PARK_MANAGER') {
      await prisma.parkManager.update({ where: { userId }, data: { biometricData: serialized } });
    }

    return { message: 'Biometric data registered successfully' };
  }

  /**
   * Verify biometric token (1:1 Verification)
   */
  async verifyBiometric(userId: string, capturedToken: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true, agent: true, parkManager: true }
    });

    const storedData = 
      user?.passenger?.biometricData || 
      user?.driver?.biometricData || 
      user?.agent?.biometricData || 
      user?.parkManager?.biometricData;

    if (!user || !storedData) {
      throw createError('Biometric data not registered', 404);
    }

    try {
      // 1. Decrypt stored biometric template (Reference)
      const encrypted = deserializeEncryptedData(storedData);
      const storedTemplate = decryptBiometricData(encrypted);

      // 2. Call Java Microservice for 1:1 matching
      // ref = 512 bytes, mat = 256 bytes
      const result = await this.callMatchingService('/match', {
        ref: storedTemplate,
        mat: capturedToken
      });

      // If service is unavailable in dev, fallback to simple string match
      if (result === null) return storedTemplate === capturedToken;

      return result.match === true && result.score >= MATCH_THRESHOLD;
    } catch (error) {
      throw createError('Failed to verify biometric data', 500);
    }
  }

  /**
   * Identify a user by their biometric template (1:N Search)
   */
  async identifyUser(capturedToken: string, userType: 'PASSENGER' | 'DRIVER' = 'PASSENGER') {
    // 1. Fetch all candidate templates for this user type
    let candidates: any[] = [];
    
    if (userType === 'PASSENGER') {
      const passengers = await prisma.passenger.findMany({
        where: { biometricData: { not: null } },
        select: { id: true, biometricData: true }
      });
      candidates = passengers;
    } else {
      const drivers = await prisma.driver.findMany({
        where: { biometricData: { not: null } },
        select: { id: true, biometricData: true }
      });
      candidates = drivers;
    }

    if (candidates.length === 0) return null;

    // Decrypt all candidates
    const processedCandidates = candidates.map(c => {
      try {
        const encrypted = deserializeEncryptedData(c.biometricData);
        return {
          id: c.id,
          ref: decryptBiometricData(encrypted)
        };
      } catch {
        return null;
      }
    }).filter(c => c !== null);

    // 2. Call Java Microservice for 1:N identification
    const result = await this.callMatchingService('/identify', {
      mat: capturedToken,
      candidates: processedCandidates
    });

    if (result && result.id && result.score >= MATCH_THRESHOLD) {
      return await this.fetchUserProfile(result.id, userType);
    }

    return null;
  }

  /**
   * Helper to fetch full profile after identification
   */
  private async fetchUserProfile(id: string, userType: string) {
    if (userType === 'PASSENGER') {
      return await prisma.passenger.findUnique({
        where: { id },
        include: { user: true }
      });
    } else if (userType === 'DRIVER') {
      return await prisma.driver.findUnique({
        where: { id },
        include: { user: true }
      });
    }
    return null;
  }

  /**
   * Remove biometric data
   */
  async removeBiometric(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) throw createError('User not found', 404);

    if (user.role === 'PASSENGER') {
      await prisma.passenger.update({ where: { userId }, data: { biometricData: null } });
    } else if (user.role === 'DRIVER') {
      await prisma.driver.update({ where: { userId }, data: { biometricData: null } });
    } else if (user.role === 'AGENT') {
      await prisma.agent.update({ where: { userId }, data: { biometricData: null } });
    } else if (user.role === 'PARK_MANAGER') {
      await prisma.parkManager.update({ where: { userId }, data: { biometricData: null } });
    }

    return { message: 'Biometric data removed successfully' };
  }

  /**
   * Check if biometric is registered
   */
  async isBiometricRegistered(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true, agent: true, parkManager: true }
    });

    return !!(
      user?.passenger?.biometricData || 
      user?.driver?.biometricData || 
      user?.agent?.biometricData || 
      user?.parkManager?.biometricData
    );
  }
}

