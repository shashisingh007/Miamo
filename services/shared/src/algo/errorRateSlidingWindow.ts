/**
 * errorRateSlidingWindow \u2014 Phase 18 short/long error-rate sliding window
 * aggregator (pure).
 *
 * Maintains two ring buffers of per-second outcome counts (ok/err) for a
 * short window and a long window. `record({ok, err})` shifts time forward
 * by one second. `snapshot()` returns instant short/long error rates and
 * a simple "spike" verdict (short rate >> long rate).
 */

export type ErrorWindowSnapshot = {
  shortRate: number; // 0..1
  longRate: number;  // 0..1
  shortTotal: number;
  longTotal: number;
  spike: boolean;
};

export type ErrorWindowOptions = {
  shortSeconds?: number;        // default 60
  longSeconds?: number;         // default 600
  spikeRatio?: number;          // shortRate / max(longRate,\u03b5)  >= spikeRatio
  spikeMinShortErrors?: number; // require >=N short err to fire
};

type Bucket = { ok: number; err: number };

export function createErrorRateWindow(opts: ErrorWindowOptions = {}) {
  const shortLen = Math.max(1, opts.shortSeconds ?? 60);
  const longLen = Math.max(shortLen, opts.longSeconds ?? 600);
  const spikeRatio = opts.spikeRatio ?? 5;
  const minShortErr = opts.spikeMinShortErrors ?? 5;

  const short: Bucket[] = Array.from({ length: shortLen }, () => ({ ok: 0, err: 0 }));
  const long: Bucket[] = Array.from({ length: longLen }, () => ({ ok: 0, err: 0 }));

  let shortHead = 0;
  let longHead = 0;
  let shortOk = 0, shortErr = 0;
  let longOk = 0, longErr = 0;

  function record(sample: { ok?: number; err?: number }) {
    const ok = Math.max(0, sample.ok ?? 0);
    const err = Math.max(0, sample.err ?? 0);
    // evict outgoing buckets first
    const sOut = short[shortHead];
    shortOk -= sOut.ok; shortErr -= sOut.err;
    sOut.ok = ok; sOut.err = err;
    shortOk += ok; shortErr += err;
    shortHead = (shortHead + 1) % shortLen;

    const lOut = long[longHead];
    longOk -= lOut.ok; longErr -= lOut.err;
    lOut.ok = ok; lOut.err = err;
    longOk += ok; longErr += err;
    longHead = (longHead + 1) % longLen;
  }

  function snapshot(): ErrorWindowSnapshot {
    const sTotal = shortOk + shortErr;
    const lTotal = longOk + longErr;
    const shortRate = sTotal > 0 ? shortErr / sTotal : 0;
    const longRate = lTotal > 0 ? longErr / lTotal : 0;
    const spike =
      shortErr >= minShortErr &&
      longRate > 0 &&
      shortRate / longRate >= spikeRatio;
    return {
      shortRate,
      longRate,
      shortTotal: sTotal,
      longTotal: lTotal,
      spike,
    };
  }

  function reset() {
    for (const b of short) { b.ok = 0; b.err = 0; }
    for (const b of long) { b.ok = 0; b.err = 0; }
    shortHead = longHead = 0;
    shortOk = shortErr = longOk = longErr = 0;
  }

  return { record, snapshot, reset };
}
