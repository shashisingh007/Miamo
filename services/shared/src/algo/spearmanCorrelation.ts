import { pearsonCorrelation } from './pearsonCorrelation';

function rank(values: readonly number[]): number[] {
  const n = values.length;
  const idx = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && idx[j + 1].v === idx[i].v) j++;
    const avg = (i + j + 2) / 2;
    for (let k = i; k <= j; k++) ranks[idx[k].i] = avg;
    i = j + 1;
  }
  return ranks;
}

export function spearmanCorrelation(
  x: readonly number[],
  y: readonly number[]
): number {
  if (x.length !== y.length) throw new Error('x and y must have equal length');
  if (x.length === 0) throw new Error('x must be non-empty');
  for (const v of x) if (!Number.isFinite(v)) throw new Error('x entries must be finite');
  for (const v of y) if (!Number.isFinite(v)) throw new Error('y entries must be finite');
  if (x.length < 2) throw new Error('need at least 2 observations');
  return pearsonCorrelation(rank(x), rank(y));
}
