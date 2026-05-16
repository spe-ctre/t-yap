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

// This is often needed to ensure the augmentation is picked up by the compiler
declare module 'express' {
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

declare module 'express-serve-static-core' {
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

export {};