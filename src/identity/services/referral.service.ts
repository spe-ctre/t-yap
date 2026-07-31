import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';

export class ReferralService {
  private generateReferralCode(name: string): string {
    const random = Math.floor(1000 + Math.random() * 9000);
    const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
    return `TYAP-${prefix}${random}`;
  }

  async getReferralInfo(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrerReferrals: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (!user) throw createError('User not found', 404);

    // Generate referral code if user doesn't have one
    if (!user.referralCode) {
      const email = user.email.split('@')[0];
      const code = this.generateReferralCode(email);
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
      user.referralCode = code;
    }

    const totalEarned = user.referrerReferrals.reduce(
      (sum: number, r: any) => sum + Number(r.referrerBonus),
      0
    );

    return {
      referralCode: user.referralCode,
      totalEarned,
      successfulReferrals: user.referrerReferrals.length,
      rewardPerReferral: 500,
      friendBonus: 300,
    };
  }

  async applyReferralCode(userId: string, referralCode: string) {
    // Check if user already used a referral code
    const existingReferral = await prisma.referral.findUnique({
      where: { referredId: userId },
    });

    if (existingReferral) {
      throw createError('You have already used a referral code', 400);
    }

    // Find referrer
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
    });

    if (!referrer) throw createError('Invalid referral code', 404);
    if (referrer.id === userId) throw createError('You cannot use your own referral code', 400);

    // Create referral record
    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId: userId,
        status: 'COMPLETED',
      },
    });

    return {
      message: 'Referral code applied successfully',
      referral,
    };
  }
}
