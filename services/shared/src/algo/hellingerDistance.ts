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

export function hellingerDistance(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) throw new Error('p and q must have equal length');
  validate(p, 'p');
  validate(q, 'q');
  const np = normalize(p);
  const nq = normalize(q);
  let s = 0;
  for (let i = 0; i < np.length; i++) {
    const d = Math.sqrt(np[i]) - Math.sqrt(nq[i]);
    s += d * d;
  }
  return Math.sqrt(s) / Math.SQRT2;
}
