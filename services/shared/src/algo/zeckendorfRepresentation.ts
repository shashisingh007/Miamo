// Zeckendorf's theorem: every positive integer has a unique representation as
// a sum of non-consecutive Fibonacci numbers (F_2=1, F_3=2, F_4=3, F_5=5, ...).

function fibsUpTo(n: number): number[] {
  const fibs: number[] = [1, 2];
  while (fibs[fibs.length - 1] + fibs[fibs.length - 2] <= n) {
    fibs.push(fibs[fibs.length - 1] + fibs[fibs.length - 2]);
  }
  return fibs;
}

export function zeckendorfDecompose(n: number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('zeckendorfDecompose: n must be non-negative integer');
  if (n === 0) return [];
  const fibs = fibsUpTo(n);
  const out: number[] = [];
  let r = n;
  for (let i = fibs.length - 1; i >= 0; i -= 1) {
    if (fibs[i] <= r) {
      out.push(fibs[i]);
      r -= fibs[i];
      i -= 1; // skip neighbor (non-consecutive guarantee)
    }
    if (r === 0) break;
  }
  return out;
}

export function zeckendorfReconstruct(parts: number[]): number {
  if (!Array.isArray(parts)) throw new Error('zeckendorfReconstruct: parts must be array');
  let s = 0;
  for (const p of parts) {
    if (!Number.isInteger(p) || p <= 0) throw new Error('zeckendorfReconstruct: parts must be positive integers');
    s += p;
  }
  return s;
}

export function zeckendorfRepresentation() {
  return { zeckendorfDecompose, zeckendorfReconstruct };
}
