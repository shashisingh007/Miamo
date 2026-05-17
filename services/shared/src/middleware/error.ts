// ─── Shared Error Handler ────────────────────────────
import { Request, Response, NextFunction } from 'express';

/**
 * Custom application error with HTTP status code and machine-readable error code.
 * Throw this in route handlers to return structured error responses.
 *
 * @example
 * ```ts
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND');
 * ```
 */
export class AppError extends Error {
  statusCode: number;
  code: string;
  /**
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param code - Machine-readable error code (default: 'UNKNOWN_ERROR')
   */
  constructor(message: string, statusCode: number, code: string = 'UNKNOWN_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Global Express error handler middleware.
 * Catches all unhandled errors and returns a consistent JSON error response.
 * Logs errors to stderr in non-test environments.
 */
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'Internal server error';
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[ERROR] ${statusCode} ${code}: ${message}`);
  }
  res.status(statusCode).json({ error: { message, code, statusCode } });
}
