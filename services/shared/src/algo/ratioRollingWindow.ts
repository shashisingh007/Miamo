// Rolling ratio over a sliding time window — additive infra. New symbols only.
// Tracks numerator events and denominator events independently and reports
// `ratio = numerator / denominator` within the last windowMs.

export interface RatioRollingWindowOptions {
  windowMs: number;
  now?: () => number;
}

export interface RatioRollingWindow {
  recordNumerator(weight?: number): void;
  recordDenominator(weight?: number): void;
  /** num / den across the current window; 0 if denominator is 0. */
  ratio(): number;
  /** Snapshot of (numerator, denominator, ratio, count) after pruning. */
  snapshot(): { numerator: number; denominator: number; ratio: number; entries: number };
  reset(): void;
}

interface Entry {
  ts: number;
  num: number;
  den: number;
}

export function createRatioRollingWindow(opts: RatioRollingWindowOptions): RatioRollingWindow {
  if (!Number.isFinite(opts.windowMs) || opts.windowMs <= 0) {
    throw new Error('windowMs must be positive');
  }
  const now = opts.now ?? (() => Date.now());
  // Ring buffer-ish: we keep an array sorted by insertion order (== ts since `now` is monotonic-ish)
  const events: Entry[] = [];
  let head = 0; // index of oldest active entry (we shift conceptually by advancing head)
  let totalNum = 0;
  let totalDen = 0;

  function prune(): void {
    const cutoff = now() - opts.windowMs;
    while (head < events.length && events[head].ts <= cutoff) {
      totalNum -= events[head].num;
      totalDen -= events[head].den;
      head++;
    }
    // Compact occasionally to bound memory
    if (head > 1024 && head * 2 > events.length) {
      events.splice(0, head);
      head = 0;
    }
  }

  function record(num: number, den: number): void {
    prune();
    const w = num + den;
    if (w === 0) return;
    const ts = now();
    const last = events[events.length - 1];
    if (last && last.ts === ts) {
      last.num += num;
      last.den += den;
    } else {
      events.push({ ts, num, den });
    }
    totalNum += num;
    totalDen += den;
  }

  function safeWeight(w: number | undefined): number {
    const n = w === undefined ? 1 : w;
    if (!Number.isFinite(n) || n < 0) throw new Error('weight must be a non-negative finite number');
    return n;
  }

  return {
    recordNumerator(weight) {
      record(safeWeight(weight), 0);
    },
    recordDenominator(weight) {
      record(0, safeWeight(weight));
    },
    ratio() {
      prune();
      if (totalDen === 0) return 0;
      return totalNum / totalDen;
    },
    snapshot() {
      prune();
      return {
        numerator: totalNum,
        denominator: totalDen,
        ratio: totalDen === 0 ? 0 : totalNum / totalDen,
        entries: events.length - head,
      };
    },
    reset() {
      events.length = 0;
      head = 0;
      totalNum = 0;
      totalDen = 0;
    },
  };
}
