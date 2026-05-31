export interface WagnerFischerOptions {
  insertCost?: number;
  deleteCost?: number;
  substituteCost?: number;
}

export function wagnerFischerEdit(
  a: string,
  b: string,
  opts: WagnerFischerOptions = {},
): number {
  const ins = opts.insertCost ?? 1;
  const del = opts.deleteCost ?? 1;
  const sub = opts.substituteCost ?? 1;
  if (ins < 0 || del < 0 || sub < 0) {
    throw new Error('wagnerFischerEdit: costs must be non-negative');
  }
  const m = a.length;
  const n = b.length;
  if (m === 0) return n * ins;
  if (n === 0) return m * del;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j += 1) prev[j] = j * ins;
  for (let i = 1; i <= m; i += 1) {
    curr[0] = i * del;
    for (let j = 1; j <= n; j += 1) {
      const matchCost = a[i - 1] === b[j - 1] ? 0 : sub;
      curr[j] = Math.min(
        prev[j] + del,
        curr[j - 1] + ins,
        prev[j - 1] + matchCost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
