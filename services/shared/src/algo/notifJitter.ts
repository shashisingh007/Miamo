/**
 * notifJitter \u2014 Phase 17 deterministic per-user send-time jitter.
 *
 * Two pods scheduling the same campaign at 09:00 must not fire at the
 * identical millisecond \u2014 doing so creates DB hotspots and visible
 * \u201cthundering herd\u201d in the inbox. We add a deterministic ms offset in
 * [-maxMs, +maxMs] derived from (userId, campaignKey) so the same user
 * always lands in the same slot but the campaign is smeared evenly.
 *
 * Pure & deterministic. Uses the seedRandom mulberry32 PRNG.
 */
import { makeRng, seedFromString } from './seedRandom';

export type NotifJitterOptions = {
  /** Half-width of the jitter window in ms. Default 90s. */
  maxMs?: number;
  /** Min gap from the planned time. Default 0 (jitter can land on it). */
  minMs?: number;
};

const DEFAULT_MAX_MS = 90_000;

/** Compute the jittered send time for one (user, campaign, planned-at). */
export function jitteredSendAt(
  userId: string,
  campaignKey: string,
  plannedAtMs: number,
  opts: NotifJitterOptions = {},
): number {
  const maxMs = Math.max(0, opts.maxMs ?? DEFAULT_MAX_MS);
  const minMs = Math.max(0, opts.minMs ?? 0);
  if (maxMs === 0) return plannedAtMs;
  const seed = seedFromString(`${userId}::${campaignKey}`);
  const rng = makeRng(seed);
  const u = rng.next();           // [0, 1)
  const span = maxMs - minMs;
  const magnitude = minMs + u * span;
  const sign = rng.next() < 0.5 ? -1 : 1;
  return plannedAtMs + sign * Math.floor(magnitude);
}

/** Bucket many users into N evenly-spaced windows around the planned time. */
export function bucketIntoWindows(
  userIds: readonly string[],
  campaignKey: string,
  plannedAtMs: number,
  opts: NotifJitterOptions = {},
): Array<{ userId: string; sendAtMs: number }> {
  return userIds.map((id) => ({
    userId: id,
    sendAtMs: jitteredSendAt(id, campaignKey, plannedAtMs, opts),
  }));
}
