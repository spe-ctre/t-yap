import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to extract device information from request
 * Attaches deviceInfo to req object
 */
export const extractDeviceInfo = (req: Request, res: Response, next: NextFunction) => {
  req.deviceInfo = {
    ipAddress: req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for']?.toString().split(',')[0] || undefined,
    userAgent: req.headers['user-agent'] || undefined,
    deviceId: req.body.deviceId,
    deviceName: req.body.deviceName,
    deviceType: req.body.deviceType
  };

  next();
};

