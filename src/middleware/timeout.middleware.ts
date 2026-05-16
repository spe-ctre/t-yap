import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce request timeouts.
 * Prevents slow/hung requests from consuming server resources indefinitely.
 * 
 * @param timeoutMs Maximum time allowed for request processing (default: 30s)
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set the timeout
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`⏱️  Request timeout: ${req.method} ${req.originalUrl} exceeded ${timeoutMs}ms`);
        res.status(408).json({
          success: false,
          message: 'Request timeout — the server took too long to respond',
        });
      }
    }, timeoutMs);

    // Clear the timer when the response finishes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};
