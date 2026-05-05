// ─── Shared Service Base ─────────────────────────────
// Common Express app setup for all microservices
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './middleware/error';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export function createServiceApp(serviceName: string): Express {
  const app = express();

  // Security
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3100',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('short'));
  }

  // Rate limiting
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  // Health check
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        service: serviceName,
        timestamp: new Date().toISOString(),
        db: 'connected',
      });
    } catch {
      res.status(503).json({ status: 'error', service: serviceName, db: 'disconnected' });
    }
  });

  // Readiness probe
  app.get('/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ready: true, service: serviceName });
    } catch {
      res.status(503).json({ ready: false, service: serviceName });
    }
  });

  return app;
}

export function startService(app: Express, serviceName: string, port: number) {
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
      console.log(`\n⚡ Miamo ${serviceName} running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/health\n`);
    });
  }
}
