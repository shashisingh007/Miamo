/**
 * Local types — narrow aliases of the shared track contract so the web bundle
 * doesn't have to import server-side modules. Kept structurally identical to
 * services/shared/src/track/events.ts.
 */

export const SCHEMA_VERSION = 1 as const;

export type ContextHeader = {
  v: number;
  did: string;
  sid: string;
  uid?: string;
  path?: string;
  ref?: string;
  loc?: string;
  tzo?: number;
  vw?: number;
  vh?: number;
  dpr?: number;
  ua?: string;
  cs?: string[];
};

export type TrackEvent = {
  e: string;
  t: number;
  n: number;
  p?: Record<string, unknown>;
  tid?: string;
  tt?: string;
  d?: number;
};

export type TrackEnvelope = {
  ctx: ContextHeader;
  evts: TrackEvent[];
};

export const MAX_EVENTS_PER_BATCH = 50;
export const MAX_ENVELOPE_BYTES = 32 * 1024;
