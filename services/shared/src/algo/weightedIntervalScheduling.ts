// Weighted interval scheduling: maximum weight non-overlapping subset.
// Two intervals overlap if [a,b) intersects [c,d) (half-open). DP via predecessor pointer.

export interface WeightedInterval {
  start: number;
  end: number;
  weight: number;
}

export interface WeightedScheduleResult {
  totalWeight: number;
  selected: number[]; // original indices, ascending
}

function predecessor(jobs: WeightedInterval[], i: number): number {
  // Largest index j < i such that jobs[j].end <= jobs[i].start
  let lo = 0, hi = i - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (jobs[mid].end <= jobs[i].start) { ans = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return ans;
}

export function weightedIntervalScheduling(intervals: WeightedInterval[]): WeightedScheduleResult {
  for (const iv of intervals) {
    if (!Number.isFinite(iv.start) || !Number.isFinite(iv.end) || !Number.isFinite(iv.weight))
      throw new Error('non-finite field');
    if (iv.end < iv.start) throw new Error('end before start');
    if (iv.weight < 0) throw new Error('negative weight');
  }
  if (intervals.length === 0) return { totalWeight: 0, selected: [] };

  const indexed = intervals.map((iv, i) => ({ ...iv, originalIndex: i }));
  indexed.sort((a, b) => a.end - b.end || a.start - b.start);
  const sorted: WeightedInterval[] = indexed.map(({ start, end, weight }) => ({ start, end, weight }));
  const n = sorted.length;
  const p: number[] = new Array(n);
  for (let i = 0; i < n; i++) p[i] = predecessor(sorted, i);
  const dp: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const include = sorted[i].weight + (p[i] >= 0 ? dp[p[i]] : 0);
    const exclude = i > 0 ? dp[i - 1] : 0;
    dp[i] = Math.max(include, exclude);
  }

  // Reconstruct
  const chosen: number[] = [];
  let i = n - 1;
  while (i >= 0) {
    const include = sorted[i].weight + (p[i] >= 0 ? dp[p[i]] : 0);
    const exclude = i > 0 ? dp[i - 1] : 0;
    if (include >= exclude) {
      chosen.push(indexed[i].originalIndex);
      i = p[i];
    } else {
      i--;
    }
  }
  chosen.sort((a, b) => a - b);
  return { totalWeight: dp[n - 1], selected: chosen };
}
