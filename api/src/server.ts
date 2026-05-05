// ─── Miamo API Server ────────────────────────────────
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import { authRouter } from './modules/auth/routes';
import { usersRouter } from './modules/users/routes';
import { profilesRouter } from './modules/profiles/routes';
import { discoverRouter } from './modules/discover/routes';
import { matchesRouter } from './modules/matches/routes';
import { messagesRouter } from './modules/messages/routes';
import { beatsRouter } from './modules/beats/routes';
import { feedRouter } from './modules/feed/routes';
import { storiesRouter } from './modules/stories/routes';
import { videosRouter } from './modules/videos/routes';
import { creativityRouter } from './modules/creativity/routes';
import { searchRouter } from './modules/search/routes';
import { aiMatchRouter } from './modules/ai-match/routes';
import { notificationsRouter } from './modules/notifications/routes';
import { settingsRouter } from './modules/settings/routes';
import { safetyRouter } from './modules/safety/routes';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';

export const prisma = new PrismaClient();
export const app = express();

// ─── Middleware ───────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Health Check ────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── Public Routes ───────────────────────────────────
app.use('/api/v1/auth', authRouter);

// ─── Protected Routes ────────────────────────────────
app.use('/api/v1/users', authMiddleware, usersRouter);
app.use('/api/v1/profiles', authMiddleware, profilesRouter);
app.use('/api/v1/discover', authMiddleware, discoverRouter);
app.use('/api/v1/matches', authMiddleware, matchesRouter);
app.use('/api/v1/messages', authMiddleware, messagesRouter);
app.use('/api/v1/beats', authMiddleware, beatsRouter);
app.use('/api/v1/feed', authMiddleware, feedRouter);
app.use('/api/v1/stories', authMiddleware, storiesRouter);
app.use('/api/v1/videos', authMiddleware, videosRouter);
app.use('/api/v1/creativity', authMiddleware, creativityRouter);
app.use('/api/v1/search', authMiddleware, searchRouter);
app.use('/api/v1/ai-match', authMiddleware, aiMatchRouter);
app.use('/api/v1/notifications', authMiddleware, notificationsRouter);
app.use('/api/v1/settings', authMiddleware, settingsRouter);
app.use('/api/v1/safety', authMiddleware, safetyRouter);

// ─── Error Handling ──────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3200', 10);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`\n🚀 Miamo API running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3100'}\n`);
  });
}
