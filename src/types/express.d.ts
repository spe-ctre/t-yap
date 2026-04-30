declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'PASSENGER' | 'DRIVER' | 'AGENT' | 'PARK_MANAGER' | 'SUPER_ADMIN';
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