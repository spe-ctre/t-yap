import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { SessionService } from '../services/session.service';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  getSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await this.sessionService.getUserSessions((req as AuthenticatedRequest).user.id);
      res.json({ success: true, statusCode: 200, data: sessions });
    } catch (error) {
      next(error);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const result = await this.sessionService.revokeSession((req as AuthenticatedRequest).user.id, sessionId);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  revokeAllOtherSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentSessionId = (req as any).sessionId;
      if (!currentSessionId) {
        throw new Error('Session ID not found in request');
      }

      const result = await this.sessionService.revokeAllOtherSessions((req as AuthenticatedRequest).user.id, currentSessionId);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  revokeAllSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.sessionService.revokeAllSessions((req as AuthenticatedRequest).user.id);
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}

