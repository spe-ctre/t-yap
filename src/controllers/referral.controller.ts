/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { ReferralService } from '../services/referral.service';

const referralService = new ReferralService();

export class ReferralController {
  /**
   * @swagger
   * /api/referrals:
   *   get:
   *     summary: Get referral information for the user
   *     tags: [Referrals]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Referral info retrieved
   */
  static async getReferralInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const data = await referralService.getReferralInfo(userId!);
      res.status(200).json({ success: true, statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  }

  /**
   * @swagger
   * /api/referrals/apply:
   *   post:
   *     summary: Apply a referral code
   *     tags: [Referrals]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - referralCode
   *             properties:
   *               referralCode:
   *                 type: string
   *     responses:
   *       200:
   *         description: Referral code applied
   */
  static async applyReferralCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
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
