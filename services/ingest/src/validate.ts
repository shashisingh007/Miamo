import { z } from 'zod';
import { SCHEMA_VERSION, MAX_EVENTS_PER_BATCH } from '../../shared/src/track/events';

/**
 * Wire-format validation for the /v1/track endpoint.
 *
 * Strategy: validate the envelope strictly (ctx, version, batch caps) and
 * accept events with a loose schema (known names + arbitrary payload up to
 * a size cap). Per-feature schemas live with their consumers — keeping
 * ingest schema-agnostic lets us add events without redeploying ingest.
 */

const ContextSchema = z
  .object({
    v: z.number().int().min(1).max(99),
    did: z.string().min(8).max(64),
    sid: z.string().min(8).max(64),
    uid: z.string().max(64).optional(),
    path: z.string().max(512).optional(),
    ref: z.string().max(256).optional(),
    loc: z.string().max(16).optional(),
    tzo: z.number().int().min(-840).max(840).optional(),
    vw: z.number().int().min(0).max(20000).optional(),
    vh: z.number().int().min(0).max(20000).optional(),
    dpr: z.number().min(0).max(8).optional(),
    ua: z.string().max(128).optional(),
    cs: z.array(z.string().max(32)).max(8).optional(),
  })
  .strict();

const EventSchema = z
  .object({
    e: z.string().min(1).max(48),
    t: z.number().int().min(0),
    n: z.number().int().min(0).max(1_000_000),
    p: z.record(z.unknown()).optional(),
    tid: z.string().max(64).optional(),
    tt: z.string().max(32).optional(),
    d: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  })
  .strict();

export const EnvelopeSchema = z
  .object({
    ctx: ContextSchema,
    evts: z.array(EventSchema).min(1).max(MAX_EVENTS_PER_BATCH),
  })
  .strict()
  .refine((env) => env.ctx.v === SCHEMA_VERSION, {
    message: `schema version mismatch; expected ${SCHEMA_VERSION}`,
    path: ['ctx', 'v'],
  });

export type ValidEnvelope = z.infer<typeof EnvelopeSchema>;
