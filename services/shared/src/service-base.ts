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

/**
 * Shared Prisma client singleton used across all microservices.
 * Logs warnings and errors in development; errors only in production.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

/**
 * Create a pre-configured Express app for a microservice.
 *
 * Applies security middleware (Helmet, CORS), JSON parsing (10MB limit),
 * cookie parsing, request logging (Morgan), rate limiting (2000/15min),
 * and standard health (`/health`) + readiness (`/ready`) endpoints.
 *
 * @param serviceName - Name of the service (used in health check responses)
 * @returns Configured Express application
 */
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

/**
 * Start listening on the given port and attach the global error handler.
 * Does not start the server in test environments.
 *
 * @param app - Express application to start
 * @param serviceName - Service name for console output
 * @param port - TCP port to listen on
 */
export function startService(app: Express, serviceName: string, port: number) {
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'test') {
    app.listen(port, '0.0.0.0', () => {
      console.log(`\n⚡ Miamo ${serviceName} running on port ${port}`);
      console.log(`   Health: http://localhost:${port}/health\n`);
    });
  }
}
