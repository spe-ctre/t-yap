/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/profile.service';
import { updateProfileSchema, updateSettingsSchema } from '../utils/validation';
import { createError } from '../middleware/error.middleware';
import { validateFile } from '../utils/file.util';
import { getValidationErrorMessage } from '../utils/validation-error.util';

export class ProfileController {
  private profileService: ProfileService;

  constructor() {
    this.profileService = new ProfileService();
  }

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.profileService.getProfile(req.user!.id);
      res.json({ success: true, statusCode: 200, data: profile });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateProfileSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const profile = await this.profileService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, statusCode: 200, data: profile });
    } catch (error) {
      next(error);
    }
  };

  uploadProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw createError('No file provided', 400);
      }

      const validation = validateFile(req.file);
      if (!validation.isValid) {
        throw createError(validation.error!, 400);
      }

      const imageUrl = await this.profileService.uploadProfilePicture(req.user!.id, req.file);
      res.json({ success: true, statusCode: 200, data: { profilePicture: imageUrl } });
    } catch (error) {
      next(error);
    }
  };

  deleteProfilePicture = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.profileService.deleteProfilePicture(req.user!.id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await this.profileService.getSettings(req.user!.id);
      res.json({ success: true, statusCode: 200, data: settings });
    } catch (error) {
      next(error);
    }
  };

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error } = updateSettingsSchema.validate(req.body);
      if (error) {
        const message = getValidationErrorMessage(error) || 'Validation failed';
        throw createError(message, 400);
      }

      const settings = await this.profileService.updateSettings(req.user!.id, req.body);
      res.json({ success: true, statusCode: 200, data: settings });
    } catch (error) {
      next(error);
    }
  };

  deactivateAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { password } = req.body;
      if (!password) throw createError('Password is required', 400);
      const result = await this.profileService.deactivateAccount(userId, password);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { password } = req.body;
      if (!password) throw createError('Password is required', 400);
      const result = await this.profileService.deleteAccount(userId, password);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  getTiersAndLimits = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const { prisma } = require('../config/database');
      const passenger = await prisma.passenger.findUnique({
        where: { userId },
        select: { tier: true }
      });
      const tiers = [
        {
          tier: 'TIER_1',
          name: 'Tier 1',
          dailyTransactionLimit: 50000,
          maxAccountBalance: 50000,
          requirements: ['Email verification'],
          current: passenger?.tier === 'TIER_1' || !passenger?.tier
        },
        {
          tier: 'TIER_2',
          name: 'Tier 2',
          dailyTransactionLimit: 200000,
          maxAccountBalance: 500000,
          requirements: ['BVN verification', 'NIN verification'],
          current: passenger?.tier === 'TIER_2'
        },
        {
          tier: 'TIER_3',
          name: 'Tier 3',
          dailyTransactionLimit: 2000000,
          maxAccountBalance: null,
          requirements: ['Proof of address', 'NIN photo', 'Face recognition'],
          current: passenger?.tier === 'TIER_3'
        }
      ];
      res.json({ success: true, statusCode: 200, data: { tiers, currentTier: passenger?.tier || 'TIER_1' } });
    } catch (error) {
      next(error);
    }
  };
}

