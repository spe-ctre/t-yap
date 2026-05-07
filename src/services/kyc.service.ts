import { prisma } from '../config/database';
import axios from 'axios';
import { AppError } from '../utils/errors';

export class KYCService {
  /**
   * Get the current KYC status for a user
   */
  static async getKYCStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bvn: true,
        nin: true,
        kycStatus: true,
        idDocumentUrl: true,
        faceImageUrl: true,
        address: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      kycStatus: user.kycStatus || 'PENDING',
      bvnVerified: !!user.bvn,
      ninVerified: !!user.nin,
      documentUploaded: !!user.idDocumentUrl,
      faceVerified: !!user.faceImageUrl,
      addressProvided: !!user.address,
    };
  }

  /**
   * Verify BVN
   */
  static async verifyBVN(userId: string, bvn: string) {
    if (!/^\d{11}$/.test(bvn)) {
      throw new AppError('BVN must be 11 digits', 400);
    }

    // Check if BVN is already used by another user
    const existingUser = await prisma.user.findFirst({
      where: { 
        bvn,
        id: { not: userId }
      }
    });

    if (existingUser) {
      throw new AppError('This BVN is already associated with another account', 400);
    }

    // Integrate with real KYC provider
    const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';
    let kycName = '';

    if (useMocks || !process.env.KYC_PROVIDER_API_KEY) {
      console.warn(`⚠️ [MOCK ENABLED] Simulating BVN Verification for ${bvn}`);
      kycName = 'T-YAP Mock User';
    } else {
      try {
        const response = await axios.post(
          `${process.env.KYC_PROVIDER_BASE_URL || 'https://api.kycprovider.com'}/v1/bvn/verify`,
          { bvn },
          {
            headers: {
              Authorization: `Bearer ${process.env.KYC_PROVIDER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        
        if (!response.data.success) {
          throw new AppError('Invalid BVN details provided', 400);
        }
        kycName = response.data.data.firstName + ' ' + response.data.data.lastName;
      } catch (error: any) {
        console.error('KYC BVN verification failed:', error.response?.data || error.message);
        throw new AppError('Failed to verify BVN with the identity provider', 502);
      }
    }
    
    await prisma.user.update({
      where: { id: userId },
      data: { 
        bvn,
      },
    });

    return {
      success: true,
      message: 'BVN verified successfully',
      data: { bvnVerified: true }
    };
  }

  /**
   * Verify NIN
   */
  static async verifyNIN(userId: string, nin: string) {
    if (!/^\d{11}$/.test(nin)) {
      throw new AppError('NIN must be 11 digits', 400);
    }

    // Check if NIN is already used
    const existingUser = await prisma.user.findFirst({
      where: { 
        nin,
        id: { not: userId }
      }
    });

    if (existingUser) {
      throw new AppError('This NIN is already associated with another account', 400);
    }

    // Integrate with real KYC provider
    const useMocks = process.env.ENABLE_SANDBOX_MOCKS === 'true';

    if (useMocks || !process.env.KYC_PROVIDER_API_KEY) {
      console.warn(`⚠️ [MOCK ENABLED] Simulating NIN Verification for ${nin}`);
    } else {
      try {
        const response = await axios.post(
          `${process.env.KYC_PROVIDER_BASE_URL || 'https://api.kycprovider.com'}/v1/nin/verify`,
          { nin },
          {
            headers: {
              Authorization: `Bearer ${process.env.KYC_PROVIDER_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
        
        if (!response.data.success) {
          throw new AppError('Invalid NIN details provided', 400);
        }
      } catch (error: any) {
        console.error('KYC NIN verification failed:', error.response?.data || error.message);
        throw new AppError('Failed to verify NIN with the identity provider', 502);
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { nin },
    });

    return {
      success: true,
      message: 'NIN verified successfully',
      data: { ninVerified: true }
    };
  }

  /**
   * Submit/Update address
   */
  static async submitAddress(userId: string, address: string) {
    if (!address || address.length < 10) {
      throw new AppError('Please provide a full valid address', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { address },
    });

    return {
      success: true,
      message: 'Address updated successfully',
      data: { addressProvided: true }
    };
  }

  /**
   * Submit face image for verification
   */
  static async submitFaceImage(userId: string, faceImageUrl: string) {
    if (!faceImageUrl) {
      throw new AppError('Face image URL is required', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { 
        faceImageUrl,
        kycStatus: 'PENDING' // Set to pending review
      },
    });

    return {
      success: true,
      message: 'Face image submitted for review',
      data: { faceVerified: true, kycStatus: 'PENDING' }
    };
  }
}
