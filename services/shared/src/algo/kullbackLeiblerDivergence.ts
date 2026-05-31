function validateDistribution(p: readonly number[], name: string): void {
  if (p.length === 0) throw new Error(`${name} must be non-empty`);
  let sum = 0;
  for (const v of p) {
    if (!Number.isFinite(v) || v < 0) throw new Error(`${name} entries must be finite >= 0`);
    sum += v;
  }
  if (sum <= 0) throw new Error(`${name} must have positive total mass`);
}

function normalize(p: readonly number[]): number[] {
  let s = 0;
  for (const v of p) s += v;
  return p.map((v) => v / s);
}

export function kullbackLeiblerDivergence(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) throw new Error('p and q must have equal length');
  validateDistribution(p, 'p');
  validateDistribution(q, 'q');
  const np = normalize(p);
  const nq = normalize(q);
  let s = 0;
  for (let i = 0; i < np.length; i++) {
    if (np[i] === 0) continue;
    if (nq[i] === 0) return Infinity;
    s += np[i] * Math.log(np[i] / nq[i]);
  }
  return s;
}
