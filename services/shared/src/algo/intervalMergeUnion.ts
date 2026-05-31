// Merge / intersect / subtract for sorted numeric intervals.
// All intervals are half-open [start, end). Open at the right end so adjacency
// without gap can merge cleanly.

export interface Interval {
  start: number;
  end: number;
}

function validateOne(it: Interval): void {
  if (!it || typeof it.start !== 'number' || typeof it.end !== 'number') {
    throw new TypeError('interval requires numeric start/end');
  }
  if (!Number.isFinite(it.start) || !Number.isFinite(it.end)) {
    throw new Error('interval start/end must be finite');
  }
  if (it.end < it.start) throw new Error('interval end must be >= start');
}

function sortNormalized(input: ReadonlyArray<Interval>): Interval[] {
  const out: Interval[] = [];
  for (const it of input) {
    validateOne(it);
    if (it.end === it.start) continue; // skip zero-width
    out.push({ start: it.start, end: it.end });
  }
  out.sort((a, b) => a.start - b.start || a.end - b.end);
  return out;
}

export function mergeIntervals(input: ReadonlyArray<Interval>): Interval[] {
  const sorted = sortNormalized(input);
  if (sorted.length === 0) return [];
  const merged: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i++) {
    const top = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= top.end) {
      if (cur.end > top.end) top.end = cur.end;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function intersectIntervals(
  a: ReadonlyArray<Interval>,
  b: ReadonlyArray<Interval>
): Interval[] {
  const A = mergeIntervals(a);
  const B = mergeIntervals(b);
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < A.length && j < B.length) {
    const start = Math.max(A[i].start, B[j].start);
    const end = Math.min(A[i].end, B[j].end);
    if (start < end) out.push({ start, end });
    if (A[i].end < B[j].end) i++;
    else j++;
  }
  return out;
}

export function subtractIntervals(
  base: ReadonlyArray<Interval>,
  remove: ReadonlyArray<Interval>
): Interval[] {
  const A = mergeIntervals(base);
  const R = mergeIntervals(remove);
  const out: Interval[] = [];
  for (const it of A) {
    let cursor = it.start;
    for (const r of R) {
      if (r.end <= cursor) continue;
      if (r.start >= it.end) break;
      if (r.start > cursor) out.push({ start: cursor, end: Math.min(r.start, it.end) });
      cursor = Math.max(cursor, r.end);
      if (cursor >= it.end) break;
    }
    if (cursor < it.end) out.push({ start: cursor, end: it.end });
  }
  return out;
}

export function totalIntervalCoverage(input: ReadonlyArray<Interval>): number {
  const merged = mergeIntervals(input);
  let sum = 0;
  for (const it of merged) sum += it.end - it.start;
  return sum;
}
