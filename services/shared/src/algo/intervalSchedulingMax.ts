// Weighted interval scheduling: choose max-weight set of non-overlapping intervals.
// O(n log n) via sort by end, binary search for predecessor, DP.

export interface Interval {
  start: number;
  end: number;
  weight: number;
}

export interface IntervalSchedule {
  totalWeight: number;
  selected: Interval[];
}

function findPredecessor(ends: number[], target: number): number {
  // returns last index i with ends[i] <= target, or -1
  let lo = 0;
  let hi = ends.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (ends[mid] <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

export function intervalSchedulingMax(intervals: Interval[]): IntervalSchedule {
  for (const it of intervals) {
    if (!Number.isFinite(it.start) || !Number.isFinite(it.end) || !Number.isFinite(it.weight)) {
      throw new TypeError('interval fields must be finite numbers');
    }
    if (it.start > it.end) throw new RangeError('start must be <= end');
  }
  const n = intervals.length;
  if (n === 0) return { totalWeight: 0, selected: [] };
  const sorted = intervals.slice().sort((a, b) => a.end - b.end);
  const ends = sorted.map((x) => x.end);
  const dp = new Array(n + 1).fill(0);
  const pick = new Array(n + 1).fill(false);
  const pred = new Array(n).fill(-1);
  for (let i = 0; i < n; i += 1) pred[i] = findPredecessor(ends, sorted[i].start);
  for (let i = 1; i <= n; i += 1) {
    const incl = sorted[i - 1].weight + (pred[i - 1] >= 0 ? dp[pred[i - 1] + 1] : 0);
    const excl = dp[i - 1];
    if (incl > excl) {
      dp[i] = incl;
      pick[i] = true;
    } else {
      dp[i] = excl;
      pick[i] = false;
    }
  }
  const selected: Interval[] = [];
  let i = n;
  while (i > 0) {
    if (pick[i]) {
      selected.push(sorted[i - 1]);
      i = pred[i - 1] + 1;
    } else {
      i -= 1;
    }
  }
  selected.reverse();
  return { totalWeight: dp[n], selected };
}
