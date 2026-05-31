/**
 * dtmAnswerNoiseFilter \u2014 DTM Phase 16 answer-noise heuristics (pure).
 *
 * Flags suspicious answer-stream patterns that should not influence the
 * DTM profile: all-same values, strict alternation, and impossibly fast
 * submission cadence. Returns the cleaned subset plus per-reason counts
 * so the UI can decide whether to re-prompt.
 */
import type { DtmAnswerEntry } from './dtmAnswerHistory';

export type NoiseFilterOpts = {
  minIntervalMs?: number;     // default 600ms between any two answers
  allSameThreshold?: number;  // default 6 consecutive equal values
  alternationThreshold?: number; // default 8 alternations
};

export type NoiseFilterResult = {
  clean: DtmAnswerEntry[];
  dropped: number;
  reasons: Record<'too_fast' | 'all_same' | 'alternating', number>;
};

export function filterAnswerNoise(
  answers: ReadonlyArray<DtmAnswerEntry>,
  opts: NoiseFilterOpts = {},
): NoiseFilterResult {
  const minInt = Math.max(0, opts.minIntervalMs ?? 600);
  const sameTh = Math.max(2, opts.allSameThreshold ?? 6);
  const altTh = Math.max(2, opts.alternationThreshold ?? 8);

  // Work in chronological order regardless of input order.
  const sorted = [...answers].sort((a, b) => a.atMs - b.atMs);

  const clean: DtmAnswerEntry[] = [];
  const reasons = { too_fast: 0, all_same: 0, alternating: 0 };

  let lastTs = -Infinity;
  let runValue: number | null = null;
  let runCount = 0;
  let altCount = 0;
  let prevSign = 0;

  for (const a of sorted) {
    if (a.atMs - lastTs < minInt) {
      reasons.too_fast++;
      continue;
    }
    // streak detection
    if (runValue === a.value) {
      runCount++;
    } else {
      runValue = a.value;
      runCount = 1;
    }
    // alternation detection on sign
    const sign = a.value === 0 ? 0 : a.value > 0 ? 1 : -1;
    if (sign !== 0 && prevSign !== 0 && sign !== prevSign) {
      altCount++;
    } else if (sign === prevSign) {
      altCount = 0;
    }
    prevSign = sign;

    if (runCount >= sameTh) {
      reasons.all_same++;
      continue;
    }
    if (altCount >= altTh) {
      reasons.alternating++;
      continue;
    }

    clean.push(a);
    lastTs = a.atMs;
  }

  return { clean, dropped: sorted.length - clean.length, reasons };
}
