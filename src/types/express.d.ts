import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        isEmailVerified?: boolean;
        isPhoneVerified?: boolean;
      };
      deviceInfo?: {
        ipAddress?: string;
        userAgent?: string;
        deviceName?: string;
        deviceType?: string;
        deviceId?: string;
      };
    }
  }
}

export {};