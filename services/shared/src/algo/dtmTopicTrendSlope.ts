import { DTM_TOPIC_KEYS, type DtmTopicKey } from './dtmTopics';

export type DtmTopicTrendDir = 'rising' | 'flat' | 'falling';

export type DtmTopicTrendRow = {
  readonly topic: DtmTopicKey;
  readonly slope: number;
  readonly direction: DtmTopicTrendDir;
};

const INDEX = new Set<DtmTopicKey>(DTM_TOPIC_KEYS);

function cleanSeries(values: ReadonlyArray<number>): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (Number.isFinite(v)) out.push(Math.max(-1, Math.min(1, v)));
  }
  return out;
}

function olsSlope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = ys[i];
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return 0;
  return (n * sxy - sx * sy) / denom;
}

function direction(slope: number): DtmTopicTrendDir {
  if (slope > 0.02) return 'rising';
  if (slope < -0.02) return 'falling';
  return 'flat';
}

export function summarizeDtmTopicTrend(
  perTopicSeries: ReadonlyMap<DtmTopicKey, ReadonlyArray<number>>,
): DtmTopicTrendRow[] {
  const rows: DtmTopicTrendRow[] = [];
  for (const topic of DTM_TOPIC_KEYS) {
    if (!INDEX.has(topic)) continue;
    const ys = cleanSeries(perTopicSeries.get(topic) ?? []);
    const slope = olsSlope(ys);
    rows.push({ topic, slope, direction: direction(slope) });
  }
  return rows;
}
