// Hampel filter for outlier detection: replaces a point with the local median
// when it deviates from the local median by more than k * MAD (median absolute deviation)
// scaled by 1.4826 (Gaussian consistency constant).
//
//   windowRadius: integer >= 1 (window of size 2*windowRadius+1)
//   k: threshold multiplier (default 3)
//
// Returns a new array of the same length.

function median(values: number[]): number {
  const a = values.slice().sort((x, y) => x - y);
  const n = a.length;
  if (n % 2 === 1) return a[(n - 1) >> 1];
  return (a[n / 2 - 1] + a[n / 2]) / 2;
}

export function hampelFilter(x: number[], windowRadius: number, k: number = 3): number[] {
  if (!Array.isArray(x)) throw new Error('hampelFilter: array required');
  if (!Number.isInteger(windowRadius) || windowRadius < 1) throw new Error('hampelFilter: windowRadius must be positive integer');
  if (!Number.isFinite(k) || k <= 0) throw new Error('hampelFilter: k must be positive finite');
  const n = x.length;
  const out = x.slice();
  const SCALE = 1.4826;
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - windowRadius);
    const hi = Math.min(n - 1, i + windowRadius);
    const window: number[] = [];
    for (let j = lo; j <= hi; j++) {
      const v = x[j];
      if (!Number.isFinite(v)) throw new Error('hampelFilter: non-finite entry');
      window.push(v);
    }
    const med = median(window);
    const absDev = window.map((v) => Math.abs(v - med));
    const mad = median(absDev) * SCALE;
    if (mad > 0) {
      if (Math.abs(x[i] - med) > k * mad) out[i] = med;
    } else if (x[i] !== med) {
      // Degenerate MAD = 0: window is mostly constant; treat any deviation as outlier.
      out[i] = med;
    }
  }
  return out;
}
