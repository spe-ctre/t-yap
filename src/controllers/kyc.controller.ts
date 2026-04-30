import { Response, NextFunction } from 'express';
import { KYCService } from '../services/kyc.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class KYCController {
  /**
   * GET /api/kyc/status
   */
  static async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await KYCService.getKYCStatus(req.user.id);
      res.json({
        success: true,
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kyc/bvn
   */
  static async verifyBVN(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { bvn } = req.body;
      const result = await KYCService.verifyBVN(req.user.id, bvn);
      res.json({
        success: true,
        statusCode: 200,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kyc/nin
   */
  static async verifyNIN(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { nin } = req.body;
      const result = await KYCService.verifyNIN(req.user.id, nin);
      res.json({
        success: true,
        statusCode: 200,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kyc/address
   */
  static async submitAddress(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { address } = req.body;
      const result = await KYCService.submitAddress(req.user.id, address);
      res.json({
        success: true,
        statusCode: 200,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kyc/face
   */
  static async submitFace(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { faceImageUrl } = req.body;
      const result = await KYCService.submitFaceImage(req.user.id, faceImageUrl);
      res.json({
        success: true,
        statusCode: 200,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}
