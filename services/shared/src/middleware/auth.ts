// ─── Shared Auth Middleware ───────────────────────────
// Used by all microservices for JWT token validation
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-secret-change-in-production';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Internal service-to-service calls pass userId in header
  const internalUserId = req.headers['x-user-id'] as string;
  if (internalUserId && req.headers['x-internal-key'] === process.env.INTERNAL_SERVICE_KEY) {
    req.userId = internalUserId;
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' } });
  }
}
