function isPow2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export function fastWalshHadamard(a: number[], inverse = false): number[] {
  const n = a.length;
  if (n === 0) throw new Error('fwht: empty input');
  if (!isPow2(n)) throw new Error('fwht: length must be power of 2');
  const x = a.slice();
  for (let h = 1; h < n; h *= 2) {
    for (let i = 0; i < n; i += h * 2) {
      for (let j = i; j < i + h; j++) {
        const u = x[j];
        const v = x[j + h];
        x[j] = u + v;
        x[j + h] = u - v;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) x[i] /= n;
  for (const v of x) if (!Number.isFinite(v)) throw new Error('fwht: non-finite');
  return x;
}
