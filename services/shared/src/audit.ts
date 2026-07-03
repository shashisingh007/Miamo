// ─── Shared Audit & Activity Tracking ─────────────────
// Deduplicated from auth, users, social, messaging, content services

import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Create an audit log entry in the database.
 * Silently catches errors to avoid disrupting the calling operation.
 *
 * @param prisma - Prisma client instance
 * @param userId - ID of the user performing the action
 * @param action - Action identifier (e.g. 'login', 'profile_update', 'delete_account')
 * @param details - Optional key-value details about the action
 */
export async function auditLog(
  prisma: PrismaClient,
  userId: string,
  action: string,
  details: Record<string, unknown> = {}
) {
  try {
    await prisma.auditLog.create({ data: { userId, action, details: JSON.stringify(details) } });
  } catch (e) {
    logger.warn('Audit log write failed:', e);
  }
}

/**
 * Track a user activity event for behavioral analysis and AI matching.
 * Fire-and-forget: non-blocking, silently catches errors.
 *
 * @param prisma - Prisma client instance
 * @param userId - ID of the user performing the activity
 * @param action - Activity type (e.g. 'like', 'pass', 'page_view', 'page_dwell')
 * @param targetType - Entity type (e.g. 'profile', 'post', 'page', 'query')
 * @param targetId - Optional ID of the target entity
 * @param metadata - Optional JSON metadata (search query, filters, etc.)
 * @param durationMs - Optional time spent in milliseconds
 */
export function trackActivity(
  prisma: PrismaClient,
  userId: string,
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, unknown>,
  durationMs?: number
) {
  prisma.userActivity.create({
    data: {
      userId,
      action,
      targetType,
      targetId,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      durationMs,
    },
  }).catch((e: unknown) => logger.warn('Activity tracking failed:', e));
}
