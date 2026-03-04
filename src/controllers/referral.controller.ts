import { Request, Response, NextFunction } from 'express';
import { ReferralService } from '../services/referral.service';

const referralService = new ReferralService();

export class ReferralController {
  static async getReferralInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const data = await referralService.getReferralInfo(userId!);
      res.status(200).json({ success: true, statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  }

  static async applyReferralCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { referralCode } = req.body;
      if (!referralCode) {
        return res.status(400).json({ success: false, message: 'Referral code is required' });
      }
      const data = await referralService.applyReferralCode(userId!, referralCode);
      res.status(200).json({ success: true, statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  }
}
