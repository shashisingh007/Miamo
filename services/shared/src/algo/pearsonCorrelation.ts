function validate(a: readonly number[], name: string): void {
  if (a.length === 0) throw new Error(`${name} must be non-empty`);
  for (const v of a) if (!Number.isFinite(v)) throw new Error(`${name} entries must be finite`);
}

export function pearsonCorrelation(
  x: readonly number[],
  y: readonly number[]
): number {
  if (x.length !== y.length) throw new Error('x and y must have equal length');
  validate(x, 'x');
  validate(y, 'y');
  if (x.length < 2) throw new Error('need at least 2 observations');
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < x.length; i++) {
    sx += x[i];
    sy += y[i];
  }
  const mx = sx / x.length;
  const my = sy / y.length;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < x.length; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) throw new Error('zero variance vector');
  return num / Math.sqrt(dx2 * dy2);
}
