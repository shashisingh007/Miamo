import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from './errorHandler';

function appFor(handler: express.RequestHandler): express.Express {
  const app = express();
  app.use(express.json());
  app.get('/throw', handler);
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('responds 500 with INTERNAL_ERROR for plain Error', async () => {
    const app = appFor((_req, _res, next) => next(new Error('boom')));
    const res = await request(app).get('/throw');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
    expect(res.body.error.statusCode).toBe(500);
  });

  it('preserves AppError statusCode/code/message', async () => {
    const app = appFor((_req, _res, next) => {
      const e: { statusCode: number; code: string; message: string } = {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Missing widget',
      };
      next(e);
    });
    const res = await request(app).get('/throw');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { message: 'Missing widget', code: 'NOT_FOUND', statusCode: 404 } });
  });

  it('maps Prisma P2003 on userId to 401 UNAUTHORIZED', async () => {
    const app = appFor((_req, _res, next) => {
      next({ code: 'P2003', message: 'Foreign key constraint failed on the field: `userId`' });
    });
    const res = await request(app).get('/throw');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('masks 5xx message in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const app = appFor((_req, _res, next) => next(new Error('internal secret leak')));
      const res = await request(app).get('/throw');
      expect(res.body.error.message).toBe('Internal server error');
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
