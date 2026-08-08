import { prisma } from '../../shared/config/database';
import axios from 'axios';
import { AppError } from '../../shared/utils/errors';
import { getCloudinary, isCloudinaryAvailable } from '../../shared/config/cloudinary';
import { dojahService } from './dojah.service';

// Previously this called a fake, never-integrated placeholder provider
// (https://api.kycprovider.com) with no name-matching and no way to ever
// reach kycStatus 'APPROVED' automatically. This now mirrors the same
// Dojah-based verification built for agent.service.ts: real BVN/NIN checks
// with name-match confidence scoring, a document-vs-selfie cross-check, and
// auto-approval once everything required is on file and clean. Ambiguous
// results fall to a new admin queue (see admin.controller.ts
// getPendingUserKYC/approveUserKYC/rejectUserKYC) instead of being a dead
// end - previously NOTHING in the codebase ever set User.kycStatus to
// 'APPROVED', so every passenger who submitted a face image was stuck in
// PENDING permanently.

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
        kycVerificationLog: true,
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
      verificationLog: user.kycVerificationLog || {},
    };
  }

  /**
   * Resolves a display name for Dojah name-matching. User has no name field
   * of its own - names live on the role-specific profile (Passenger,
   * Driver, Agent, ParkManager). These /api/kyc/* routes aren't currently
   * role-restricted, so check whichever profile actually exists rather than
   * assuming Passenger.
   */
  private static async resolveUserName(userId: string): Promise<{ firstName: string; lastName: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { passenger: true, driver: true, agent: true, parkManager: true },
    });

    const profile: any = user?.passenger || user?.driver || user?.agent || user?.parkManager;
    const firstName = profile?.firstName || '';
    const lastName = profile?.lastName || '';

    if (!firstName || !lastName) {
      throw new AppError(
        'Please complete your profile (first and last name) before submitting BVN/NIN for verification',
        400
      );
    }

    return { firstName, lastName };
  }

  /**
   * Fetches an already-uploaded Cloudinary image and returns it as base64,
   * for cross-checking the face image against the ID document (or vice
   * versa) once both are on file.
   */
  private static async fetchImageAsBase64(url: string): Promise<string> {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(response.data).toString('base64');
  }

  /**
   * Runs the selfie-vs-ID-document match once BOTH a face image and an ID
   * document exist. Unlike the agent flow (POS hardware, no real camera for
   * a live selfie - has to cross-check against the government's own photo
   * instead), this IS a genuine live selfie captured via /api/kyc/face on a
   * passenger's phone, so this is the textbook use of Dojah's
   * verifyPhotoId - real liveness/identity assurance, not just
   * document-to-record consistency.
   */
  private static async runDocumentCrossCheck(userId: string, faceImageUrl: string, idDocumentUrl: string) {
    const [faceBase64, idBase64] = await Promise.all([
      this.fetchImageAsBase64(faceImageUrl),
      this.fetchImageAsBase64(idDocumentUrl),
    ]);

    const result = await dojahService.verifyPhotoId(faceBase64, idBase64);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const verificationLog: Record<string, any> = (user as any)?.kycVerificationLog || {};
    verificationLog.documentMatch = { ...result, checkedAt: new Date().toISOString() };

    if (result.status === 'REJECTED') {
      await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
      });
      throw new AppError(`Selfie does not match ID document: ${result.reason}`, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { kycVerificationLog: verificationLog },
    });
  }

  /**
   * Checks every logged Dojah check plus both required uploads, and
   * auto-approves if everything is present and clean. Called after every
   * verification step (BVN, NIN, face, document) so KYC completes the
   * moment the LAST required piece lands, regardless of what order the
   * person submits things in. Anything incomplete or ambiguous just leaves
   * kycStatus at PENDING, which the admin queue below picks up.
   */
  private static async maybeFinalizeKycStatus(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const hasIdentityNumber = !!user.bvn || !!user.nin;
    const hasBothImages = !!user.idDocumentUrl && !!user.faceImageUrl;
    if (!hasIdentityNumber || !hasBothImages) return; // not done yet, stays PENDING

    const verificationLog: Record<string, any> = (user as any).kycVerificationLog || {};
    const checks = Object.values(verificationLog) as { status?: string }[];
    const allChecksPassed = checks.length > 0 && checks.every((c) => c.status === 'APPROVED');

    if (allChecksPassed && user.kycStatus !== 'REJECTED') {
      await prisma.user.update({ where: { id: userId }, data: { kycStatus: 'APPROVED' } });
    }
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

    const { firstName, lastName } = await this.resolveUserName(userId);
    const bvnResult = await dojahService.verifyBvn(bvn, firstName, lastName);

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const verificationLog: Record<string, any> = (currentUser as any)?.kycVerificationLog || {};
    verificationLog.bvn = { ...bvnResult, checkedAt: new Date().toISOString() };

    if (bvnResult.status === 'REJECTED') {
      await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
      });
      throw new AppError(`BVN verification failed: ${bvnResult.reason}`, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { bvn, kycVerificationLog: verificationLog },
    });

    await this.maybeFinalizeKycStatus(userId);
    const updated = await prisma.user.findUnique({ where: { id: userId } });

    return {
      success: true,
      message: bvnResult.status === 'REVIEW'
        ? 'BVN submitted - name match was ambiguous, routed for manual review'
        : 'BVN verified successfully',
      data: { bvnVerified: true, kycStatus: updated?.kycStatus },
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

    const { firstName, lastName } = await this.resolveUserName(userId);
    const ninResult = await dojahService.verifyNin(nin, firstName, lastName);

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const verificationLog: Record<string, any> = (currentUser as any)?.kycVerificationLog || {};
    verificationLog.nin = { ...ninResult, checkedAt: new Date().toISOString() };

    if (ninResult.status === 'REJECTED') {
      await prisma.user.update({
        where: { id: userId },
        data: { kycStatus: 'REJECTED', kycVerificationLog: verificationLog },
      });
      throw new AppError(`NIN verification failed: ${ninResult.reason}`, 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { nin, kycVerificationLog: verificationLog },
    });

    await this.maybeFinalizeKycStatus(userId);
    const updated = await prisma.user.findUnique({ where: { id: userId } });

    return {
      success: true,
      message: ninResult.status === 'REVIEW'
        ? 'NIN submitted - name match was ambiguous, routed for manual review'
        : 'NIN verified successfully',
      data: { ninVerified: true, kycStatus: updated?.kycStatus },
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
 * Upload face image to Cloudinary for KYC verification
 */
static async uploadFaceImage(userId: string, file: Express.Multer.File): Promise<any> {
  if (!isCloudinaryAvailable()) {
    throw new AppError('Face image upload is not available. Cloudinary is not configured.', 503);
  }
  const cloudinary = getCloudinary();
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `tyap/kyc/face`,
        public_id: userId,
        overwrite: true,
        resource_type: 'image'
      },
      async (error: any, result: any) => {
        if (error) {
          reject(new AppError('Failed to upload face image', 500));
          return;
        }
        if (!result) {
          reject(new AppError('Upload failed', 500));
          return;
        }
        try {
          const submitResult = await this.submitFaceImage(userId, result.secure_url);
          resolve(submitResult);
        } catch (err) {
          if (isCloudinaryAvailable() && result?.public_id) {
            await cloudinary.uploader.destroy(result.public_id).catch(() => {});
          }
          reject(err);
        }
      }
    );
    uploadStream.end(file.buffer);
  });
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
      data: { faceImageUrl },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.idDocumentUrl) {
      // The ID document was already uploaded before this face image -
      // run the cross-check now rather than waiting on a separate step.
      await this.runDocumentCrossCheck(userId, faceImageUrl, user.idDocumentUrl);
    }

    await this.maybeFinalizeKycStatus(userId);
    const updated = await prisma.user.findUnique({ where: { id: userId } });

    return {
      success: true,
      message: 'Face image submitted for review',
      data: { faceVerified: true, kycStatus: updated?.kycStatus || 'PENDING' }
    };
  }

  /**
   * Upload an ID document image to Cloudinary and record it, mirroring the
   * agent flow's document upload. Previously there was NO way at all for a
   * passenger to upload an ID document - User.idDocumentUrl existed on the
   * schema but nothing ever set it.
   */
  static async uploadDocument(
    userId: string,
    file: Express.Multer.File,
    documentType: string,
    documentNumber?: string
  ): Promise<any> {
    if (!file) {
      throw new AppError('ID document image is required', 400);
    }
    if (!documentType) {
      throw new AppError('Document type is required', 400);
    }
    if (!isCloudinaryAvailable()) {
      throw new AppError('Document upload is not available. Cloudinary is not configured.', 503);
    }

    const cloudinary = getCloudinary();
    const documentUrl: string = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'tyap/kyc/documents',
          public_id: `${userId}-${Date.now()}`,
          resource_type: 'image',
        },
        (error: any, result: any) => {
          if (error || !result) {
            reject(new AppError('Failed to upload document image', 500));
            return;
          }
          resolve(result.secure_url);
        }
      );
      uploadStream.end(file.buffer);
    });

    const document = await prisma.document.create({
      data: { userId, documentType: documentType as any, url: documentUrl, documentNumber, status: 'PENDING' },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { idDocumentUrl: documentUrl },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.faceImageUrl) {
      // Face image already exists from a prior /api/kyc/face call - run the
      // cross-check now.
      await this.runDocumentCrossCheck(userId, user.faceImageUrl, documentUrl);
    }

    await this.maybeFinalizeKycStatus(userId);
    const updated = await prisma.user.findUnique({ where: { id: userId } });

    return {
      success: true,
      message: 'Document uploaded and submitted for review',
      data: { document, documentUploaded: true, kycStatus: updated?.kycStatus || 'PENDING' },
    };
  }
}