import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { createError } from '../middleware/error.middleware';
import { UserRole } from '../middleware/auth.middleware';

export class SessionService {
  /**
   * Create a new session
   */
  async createSession(userId: string, deviceInfo?: {
    deviceId?: string;
    deviceName?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
  }, role?: UserRole) {
    const token = this.generateToken(userId, role);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.userSession.create({
      data: {
        userId,
        token,
        deviceId: deviceInfo?.deviceId,
        deviceName: deviceInfo?.deviceName,
        deviceType: deviceInfo?.deviceType,
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        expiresAt
      }
    });

    return {
      session: {
        id: session.id,
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        ipAddress: session.ipAddress,
        lastActivity: session.lastActivity,
        createdAt: session.createdAt
      },
      token
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string) {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });

    return sessions.map(session => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt
    }));
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string) {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() }
    });
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true
      }
    });

    if (!session) {
      throw createError('Session not found', 404);
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false }
    });

    return { message: 'Session revoked successfully' };
  }

  /**
   * Revoke all other sessions (except current)
   */
  async revokeAllOtherSessions(userId: string, currentSessionId: string) {
    await prisma.userSession.updateMany({
      where: {
        userId,
        id: { not: currentSessionId },
        isActive: true
      },
      data: { isActive: false }
    });

    return { message: 'All other sessions revoked successfully' };
  }

  /**
   * Revoke all sessions
   */
  async revokeAllSessions(userId: string) {
    await prisma.userSession.updateMany({
      where: {
        userId,
        isActive: true
      },
      data: { isActive: false }
    });

    return { message: 'All sessions revoked successfully' };
  }

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<{ sessionId: string; userId: string } | null> {
    try {
      // Verify JWT
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined');
      }

      const decoded = jwt.verify(token, secret) as { userId: string };
      
      // Check if session exists and is active
      const session = await prisma.userSession.findFirst({
        where: {
          token,
          userId: decoded.userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (!session) {
        return null;
      }

      // Update last activity
      await this.updateSessionActivity(session.id);

      return {
        sessionId: session.id,
        userId: decoded.userId
      };
    } catch {
      return null;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions() {
    const result = await prisma.userSession.updateMany({
      where: {
        expiresAt: { lt: new Date() },
        isActive: true
      },
      data: { isActive: false }
    });

    return { count: result.count };
  }

  private generateToken(userId: string, role?: UserRole): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
  }
}

