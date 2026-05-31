function validate(a: readonly number[], name: string): void {
  if (a.length === 0) throw new Error(`${name} must be non-empty`);
  for (const v of a) if (!Number.isFinite(v)) throw new Error(`${name} entries must be finite`);
}

function tieGroups(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  let total = 0;
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[i]) j++;
    const t = j - i + 1;
    if (t > 1) total += (t * (t - 1)) / 2;
    i = j + 1;
  }
  return total;
}

export function kendallTau(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length) throw new Error('x and y must have equal length');
  validate(x, 'x');
  validate(y, 'y');
  if (x.length < 2) throw new Error('need at least 2 observations');
  let c = 0;
  let d = 0;
  for (let i = 0; i < x.length; i++) {
    for (let j = i + 1; j < x.length; j++) {
      const dx = x[i] - x[j];
      const dy = y[i] - y[j];
      const s = dx * dy;
      if (s > 0) c++;
      else if (s < 0) d++;
    }
  }
  const n = x.length;
  const n0 = (n * (n - 1)) / 2;
  const n1 = tieGroups(x);
  const n2 = tieGroups(y);
  const denom = Math.sqrt((n0 - n1) * (n0 - n2));
  if (denom === 0) throw new Error('zero denominator: all values tied');
  return (c - d) / denom;
}
