// ─── Shared Auth Middleware ───────────────────────────
// Used by all microservices for JWT token validation
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'miamo-dev-jwt-secret-change-in-production-2026';

/**
 * Express request type extended with authenticated user ID.
 * Populated by `authMiddleware` after successful JWT verification.
 */
export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * JWT authentication middleware for all microservices.
 *
 * Two authentication paths:
 * 1. **Internal service-to-service**: Trusts `x-user-id` header when accompanied
 *    by a valid `x-internal-key` (set by the API Gateway).
 * 2. **External client**: Verifies a `Bearer` JWT from the Authorization header.
 *
 * On success, sets `req.userId` and calls `next()`. On failure, returns 401.
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // Internal service-to-service calls pass userId in header
  const internalUserId = req.headers['x-user-id'] as string;
  if (internalUserId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    req.userId = internalUserId;
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired token', code: 'TOKEN_INVALID' } });
  }
}
