// Isotonic regression (Pool Adjacent Violators).
// Given values y and optional weights w, returns the non-decreasing sequence yhat
// that minimizes sum w_i * (y_i - yhat_i)^2.

export function isotonicRegression(y: number[], weights?: number[]): number[] {
  const n = y.length;
  if (n === 0) throw new Error('isotonicRegression: empty');
  const w = weights ?? new Array(n).fill(1);
  if (w.length !== n) throw new Error('isotonicRegression: length mismatch');
  for (const wi of w) {
    if (!(wi > 0)) throw new Error('isotonicRegression: weights must be positive');
  }
  // Stack of blocks: each block { sum (sum w_i*y_i), wt (sum w_i), start, end }
  const sum: number[] = [];
  const wt: number[] = [];
  const start: number[] = [];
  const end: number[] = [];
  for (let i = 0; i < n; i++) {
    let curSum = w[i] * y[i];
    let curWt = w[i];
    let curStart = i;
    let curEnd = i;
    while (sum.length > 0 && sum[sum.length - 1] / wt[sum.length - 1] >= curSum / curWt) {
      curSum += sum.pop()!;
      curWt += wt.pop()!;
      curStart = start.pop()!;
      end.pop();
    }
    sum.push(curSum);
    wt.push(curWt);
    start.push(curStart);
    end.push(curEnd);
  }
  const out = new Array(n);
  for (let b = 0; b < sum.length; b++) {
    const v = sum[b] / wt[b];
    for (let i = start[b]; i <= end[b]; i++) out[i] = v;
  }
  return out;
}
