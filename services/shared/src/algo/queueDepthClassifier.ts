export type QueueDepthSample = { readonly tsMs: number; readonly depth: number };

export type QueueDepthBand = 'idle' | 'normal' | 'busy' | 'saturated';

export type QueueDepthSummary = {
  readonly current: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  readonly band: QueueDepthBand;
  readonly trend: 'rising' | 'falling' | 'flat';
};

export type QueueDepthOptions = {
  readonly busyThreshold: number;
  readonly saturatedThreshold: number;
  readonly windowMs?: number;
};

function clean(n: number): number | null {
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function percentile(sortedAsc: ReadonlyArray<number>, p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.floor(((sortedAsc.length - 1) * p) / 100)),
  );
  return sortedAsc[idx];
}

export function summarizeQueueDepth(
  samples: ReadonlyArray<QueueDepthSample>,
  nowMs: number,
  opts: QueueDepthOptions,
): QueueDepthSummary {
  const windowMs = clean(opts.windowMs ?? Number.POSITIVE_INFINITY) ?? Number.POSITIVE_INFINITY;
  const busy = Math.max(0, clean(opts.busyThreshold) ?? 0);
  const sat = Math.max(busy, clean(opts.saturatedThreshold) ?? busy);
  const from = Number.isFinite(windowMs) ? nowMs - windowMs : -Infinity;

  const filtered: QueueDepthSample[] = [];
  for (const s of samples) {
    if (!s) continue;
    const d = clean(s.depth);
    const t = clean(s.tsMs);
    if (d === null || t === null) continue;
    if (t >= from && t <= nowMs) filtered.push({ tsMs: t, depth: d });
  }

  if (filtered.length === 0) {
    return { current: 0, p50: 0, p95: 0, max: 0, band: 'idle', trend: 'flat' };
  }

  filtered.sort((a, b) => a.tsMs - b.tsMs);
  const depths = filtered.map((s) => s.depth).slice().sort((a, b) => a - b);
  const current = filtered[filtered.length - 1].depth;
  const max = depths[depths.length - 1];
  const p50 = percentile(depths, 50);
  const p95 = percentile(depths, 95);

  let band: QueueDepthBand = 'idle';
  if (sat > 0 && current >= sat) band = 'saturated';
  else if (busy > 0 && current >= busy) band = 'busy';
  else if (current > 0) band = 'normal';

  let trend: QueueDepthSummary['trend'] = 'flat';
  if (filtered.length >= 2) {
    const first = filtered[0].depth;
    const last = filtered[filtered.length - 1].depth;
    const diff = last - first;
    const tol = Math.max(1, p50 * 0.1);
    if (diff > tol) trend = 'rising';
    else if (diff < -tol) trend = 'falling';
  }

  return { current, p50, p95, max, band, trend };
}
