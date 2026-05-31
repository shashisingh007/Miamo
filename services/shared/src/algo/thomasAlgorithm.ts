export function thomasAlgorithm(
  a: number[],
  b: number[],
  c: number[],
  d: number[],
): number[] {
  const n = b.length;
  if (n === 0) throw new Error('thomasAlgorithm: empty system');
  if (a.length !== n - 1 || c.length !== n - 1 || d.length !== n) {
    throw new Error('thomasAlgorithm: dimension mismatch');
  }
  const cp = new Array(n - 1);
  const dp = new Array(n);
  let denom = b[0];
  if (denom === 0) throw new Error('thomasAlgorithm: zero pivot');
  cp[0] = n > 1 ? c[0] / denom : 0;
  dp[0] = d[0] / denom;
  for (let i = 1; i < n; i++) {
    denom = b[i] - a[i - 1] * cp[i - 1];
    if (denom === 0) throw new Error('thomasAlgorithm: zero pivot');
    if (i < n - 1) cp[i] = c[i] / denom;
    dp[i] = (d[i] - a[i - 1] * dp[i - 1]) / denom;
  }
  const x = new Array(n);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  for (const v of x) if (!Number.isFinite(v)) throw new Error('thomasAlgorithm: non-finite result');
  return x;
}
