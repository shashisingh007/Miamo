// Gosper's hack: iterate over all n-bit numbers with exactly k bits set,
// in ascending numerical order. Useful for enumerating fixed-size subsets.

export function gosperNextSameBits(x: number): number {
  if (!Number.isInteger(x) || x <= 0) throw new Error('gosperNextSameBits: x must be positive integer');
  // Standard Gosper trick using 32-bit safe ops; for n up to ~30 this is fine.
  const c = x & -x;
  const r = x + c;
  return (((r ^ x) >>> 2) / c) | r;
}

export function gosperSubsetsOfSize(n: number, k: number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('gosperSubsetsOfSize: n must be non-negative integer');
  if (!Number.isInteger(k) || k < 0) throw new Error('gosperSubsetsOfSize: k must be non-negative integer');
  if (n > 30) throw new Error('gosperSubsetsOfSize: n must be <= 30 for safe bit ops');
  if (k > n) return [];
  if (k === 0) return [0];
  const out: number[] = [];
  let cur = (1 << k) - 1;
  const limit = 1 << n;
  while (cur < limit) {
    out.push(cur);
    if (cur === 0) break;
    cur = gosperNextSameBits(cur);
  }
  return out;
}

export function gosperHackSubsets() {
  return { gosperNextSameBits, gosperSubsetsOfSize };
}
