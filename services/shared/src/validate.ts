/**
 * Shared zod-based request validator for Express.
 *
 * Usage:
 *   const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
 *   app.post('/login', validate({ body: schema }), handler);
 *
 * On failure responds with `{ error: { message, code: 'VALIDATION_ERROR', statusCode: 400, fields } }`
 * matching the v3.0 response contract; never throws into the error pipeline so the
 * caller can rely on a consistent 400-shaped JSON.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, ZodSchema } from 'zod';

export interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(opts: ValidateOptions): RequestHandler {
  return function validateMw(req: Request, res: Response, next: NextFunction): void {
    try {
      if (opts.body) req.body = opts.body.parse(req.body);
      if (opts.query) {
        // Express 5 makes req.query read-only via a getter — assign via Object.defineProperty
        const parsed = opts.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (opts.params) req.params = opts.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        res.status(400).json({
          error: {
            message: 'Invalid request',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            fields,
          },
        });
        return;
      }
      next(err);
    }
  };
}
