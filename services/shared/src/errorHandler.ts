/**
 * Shared Express error handler.
 *
 * - Returns AppError statusCode/message/code when present.
 * - For 5xx in production, masks message as "Internal server error" to avoid
 *   leaking internals. Always logs the underlying error.
 * - Response shape matches the v3.0 contract: `{ error: { message, code, statusCode } }`.
 */
import type { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface ErrorLike {
  statusCode?: number;
  message?: string;
  code?: string;
  stack?: string;
  name?: string;
}

interface RequestWithId extends Request {
  id?: string;
}

function isPrismaError(error: ErrorLike): boolean {
  if (typeof error?.name === 'string' && error.name.startsWith('PrismaClient')) return true;
  if (typeof error?.code === 'string' && /^P\d{4}$/.test(error.code)) return true;
  return false;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const error = err as ErrorLike;
  const requestId = (req as RequestWithId).id;
  // Prisma FK violation on userId means the user's session is stale (deleted/reseeded).
  // Treat as 401 so the web app can prompt re-login instead of showing a generic 500.
  if (error?.code === 'P2003' && error?.message?.includes('userId')) {
    res.status(401).json({ error: { message: 'Session expired — please log in again', code: 'UNAUTHORIZED', statusCode: 401, requestId } });
    return;
  }
  // Never surface raw Prisma/DB errors to clients — log internally, return generic 500.
  if (isPrismaError(error)) {
    logger.error('Database error:', { requestId, name: error.name, code: error.code, message: error.message, stack: error.stack });
    res.status(500).json({ error: { message: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR', statusCode: 500, requestId } });
    return;
  }
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500
    ? 'Something went wrong. Please try again.'
    : (error.message || 'Internal server error');
  if (statusCode >= 500) logger.error('Unhandled error:', { requestId, message: error.message, stack: error.stack });
  res.status(statusCode).json({
    error: { message, code: error.code || 'INTERNAL_ERROR', statusCode, requestId },
  });
}
