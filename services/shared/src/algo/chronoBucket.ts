/**
 * chronoBucket \u2014 Phase 17 wall-clock-to-time-of-day bucket.
 *
 * Maps an instant + IANA timezone into one of four buckets the
 * notification scheduler and chronotype overlap use:
 *
 *   night    22:00\u201305:59
 *   morning  06:00\u201311:59
 *   afternoon 12:00\u201316:59
 *   evening   17:00\u201321:59
 *
 * Pure & deterministic.
 */
export type ChronoBucket = 'night' | 'morning' | 'afternoon' | 'evening';

function localHour(atMs: number, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(new Date(atMs));
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  return h % 24;
}

export function chronoBucketOf(atMs: number, timezone: string): ChronoBucket {
  const h = localHour(atMs, timezone);
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

/** Bucket-vs-bucket compatibility (0..1) for chronotype-aware features.
 *  Same bucket = 1.0, adjacent = 0.6, opposite = 0.2. */
export function bucketAlignment(a: ChronoBucket, b: ChronoBucket): number {
  if (a === b) return 1.0;
  const order: ChronoBucket[] = ['morning', 'afternoon', 'evening', 'night'];
  const ai = order.indexOf(a);
  const bi = order.indexOf(b);
  const dist = Math.min(Math.abs(ai - bi), order.length - Math.abs(ai - bi));
  if (dist === 1) return 0.6;
  return 0.2;
}
