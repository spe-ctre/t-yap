declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
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