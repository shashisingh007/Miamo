/**
 * traceSampler \u2014 Phase 14 deterministic-by-uid trace sampling (pure).
 *
 * For a (uid, route) tuple, decide whether to ship the trace upstream.
 * Same uid + same route + same sampleRate always yields the same answer
 * inside the bucket window, so we don't fragment traces mid-session.
 *
 *   bucket   = hash(uid + ":" + route)   \u2208 [0, 2^32)
 *   sampled? = (bucket / 2^32) < sampleRate
 *
 * Also exports `forceSampleOnError` so 5xx / slow paths bypass the dice
 * roll and always make it to the SIEM.
 */
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export type TraceSampleInputs = {
  uid: string;
  route: string;
  sampleRate: number; // 0..1
  forceSample?: boolean;
};

export type TraceSampleResult = {
  sampled: boolean;
  bucket: number;     // [0, 1)
  reason: 'forced' | 'rate' | 'dropped' | 'invalid';
};

export function decideTraceSample(inp: TraceSampleInputs): TraceSampleResult {
  if (typeof inp.uid !== 'string' || typeof inp.route !== 'string' || inp.uid === '' || inp.route === '') {
    return { sampled: false, bucket: 0, reason: 'invalid' };
  }
  if (inp.forceSample === true) {
    return { sampled: true, bucket: 0, reason: 'forced' };
  }
  const rate = Number.isFinite(inp.sampleRate) ? Math.max(0, Math.min(1, inp.sampleRate)) : 0;
  if (rate === 0) return { sampled: false, bucket: 0, reason: 'dropped' };
  if (rate === 1) return { sampled: true, bucket: 0, reason: 'rate' };
  const bucket = fnv1a32(`${inp.uid}:${inp.route}`) / 0x100000000;
  return bucket < rate
    ? { sampled: true, bucket, reason: 'rate' }
    : { sampled: false, bucket, reason: 'dropped' };
}

/** Convenience for callers that just want a bool. */
export function shouldTraceOnError(): boolean { return true; }
