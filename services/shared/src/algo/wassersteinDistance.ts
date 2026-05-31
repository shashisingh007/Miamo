function validate(p: readonly number[], name: string): void {
  if (p.length === 0) throw new Error(`${name} must be non-empty`);
  let s = 0;
  for (const v of p) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`${name} entries must be finite >= 0`);
    s += v;
  }
  if (s <= 0) throw new Error(`${name} must have positive total mass`);
}

function normalize(p: readonly number[]): number[] {
  let s = 0;
  for (const v of p) s += v;
  return p.map((v) => v / s);
}

export function wassersteinDistance(
  p: readonly number[],
  q: readonly number[]
): number {
  if (p.length !== q.length) throw new Error('p and q must have equal length');
  validate(p, 'p');
  validate(q, 'q');
  const np = normalize(p);
  const nq = normalize(q);
  let cum = 0;
  let dist = 0;
  for (let i = 0; i < np.length - 1; i++) {
    cum += np[i] - nq[i];
    dist += Math.abs(cum);
  }
  return dist;
}

export function wassersteinDistanceSamples(
  xs: readonly number[],
  ys: readonly number[]
): number {
  if (xs.length === 0 || ys.length === 0) throw new Error('samples must be non-empty');
  if (xs.length !== ys.length) throw new Error('xs and ys must have equal length');
  for (const v of xs) if (!Number.isFinite(v)) throw new Error('xs entries must be finite');
  for (const v of ys) if (!Number.isFinite(v)) throw new Error('ys entries must be finite');
  const a = [...xs].sort((u, v) => u - v);
  const b = [...ys].sort((u, v) => u - v);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}
