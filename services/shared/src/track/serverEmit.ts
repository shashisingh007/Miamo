/**
 * Server-side v8 (v3.6.0) event emitter.
 *
 * Several v8 events fire from server routes rather than the web SDK
 * (because the data — KPIs, ledger writes, fairness slots — lives on
 * the server). The pattern mirrors `trackActivity` in audit.ts: a
 * fire-and-forget Prisma write into the `UserActivity` table with the
 * event name as the action, the payload encoded into `metadata`.
 *
 * The tracking-worker reads `UserActivity` and rolls it up into the
 * same `EventAggDaily` table that handles client-emitted v6/v7 events.
 *
 * All payloads are validated against `V6_VALIDATORS` before write so
 * server-side drift surfaces at boundary (not silently).
 */
import type { PrismaClient } from '@prisma/client';
import { logger } from '../logger';
import { validateV6Payload, type V6EventName } from './v6Validators';

/**
 * Emit a v8 event server-side. Non-blocking — never throws. On
 * validation failure the event is dropped with a warn-log so the
 * caller's request handler stays unaffected.
 *
 * `userId` is the actor (sender for `move.composed`, requester for
 * `exposure.slot_filled`, etc.). The hashing into `uidHash` is done
 * downstream by the tracking-worker, identical to client emits.
 *
 * @param prisma   - Prisma client instance
 * @param userId   - Actor user id
 * @param eventName- V8 event name (must be a key of V6_VALIDATORS)
 * @param payload  - Strict payload matching the named event's schema
 * @param targetId - Optional target id for query indexing
 */
export function emitServerEvent<E extends V6EventName>(
  prisma: PrismaClient,
  userId: string,
  eventName: E,
  payload: Record<string, unknown>,
  targetId?: string,
): void {
  const v = validateV6Payload(eventName, payload);
  if (!v.ok) {
    // Explicit cast — with `strict: false` in the prod Docker build TS
    // stops narrowing discriminated unions after `!v.ok`, but we know from
    // the ValidationResult type that this branch has `.error`.
    logger.warn(`[serverEmit] dropped ${eventName}: ${(v as { error: string }).error}`);
    return;
  }
  prisma.userActivity.create({
    data: {
      userId,
      action: eventName,
      targetType: 'event',
      targetId,
      metadata: JSON.stringify(payload),
    },
  }).catch((e: unknown) => logger.warn(`[serverEmit] ${eventName} write failed:`, e));
}
