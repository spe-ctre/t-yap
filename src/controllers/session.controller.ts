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
<<<<<<< HEAD
      const sessions = await this.sessionService.getUserSessions(req.user!.id);
=======
      const sessions = await this.sessionService.getUserSessions((req as AuthenticatedRequest).user.id);
>>>>>>> 95b03e7e9146b6aee31bbdc451f4b863b0a4fff3
      res.json({ success: true, statusCode: 200, data: sessions });
    } catch (error) {
      next(error);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
<<<<<<< HEAD
      const result = await this.sessionService.revokeSession(req.user!.id, sessionId);
=======
      const result = await this.sessionService.revokeSession((req as AuthenticatedRequest).user.id, sessionId);
>>>>>>> 95b03e7e9146b6aee31bbdc451f4b863b0a4fff3
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

<<<<<<< HEAD
      const result = await this.sessionService.revokeAllOtherSessions(req.user!.id, currentSessionId);
=======
      const result = await this.sessionService.revokeAllOtherSessions((req as AuthenticatedRequest).user.id, currentSessionId);
>>>>>>> 95b03e7e9146b6aee31bbdc451f4b863b0a4fff3
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  revokeAllSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
<<<<<<< HEAD
      const result = await this.sessionService.revokeAllSessions(req.user!.id);
=======
      const result = await this.sessionService.revokeAllSessions((req as AuthenticatedRequest).user.id);
>>>>>>> 95b03e7e9146b6aee31bbdc451f4b863b0a4fff3
      res.json({ success: true, statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}

