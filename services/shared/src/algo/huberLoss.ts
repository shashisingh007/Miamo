// Huber loss (robust regression):
//   L(r) = 0.5 r^2                    if |r| <= delta
//   L(r) = delta * (|r| - 0.5*delta)  otherwise
// Operates on a residual array; returns the sum.
// Also exports element-wise loss and gradient.

export function huberLossElement(r: number, delta: number): number {
  const ar = Math.abs(r);
  if (ar <= delta) return 0.5 * r * r;
  return delta * (ar - 0.5 * delta);
}

export function huberGradElement(r: number, delta: number): number {
  if (r > delta) return delta;
  if (r < -delta) return -delta;
  return r;
}

export function huberLoss(residuals: number[], delta: number = 1): number {
  if (!Array.isArray(residuals)) throw new Error('huberLoss: array required');
  if (!Number.isFinite(delta) || delta <= 0) throw new Error('huberLoss: delta must be positive finite');
  let s = 0;
  for (const r of residuals) {
    if (!Number.isFinite(r)) throw new Error('huberLoss: non-finite residual');
    s += huberLossElement(r, delta);
  }
  return s;
}

export function huberGrad(residuals: number[], delta: number = 1): number[] {
  if (!Array.isArray(residuals)) throw new Error('huberGrad: array required');
  if (!Number.isFinite(delta) || delta <= 0) throw new Error('huberGrad: delta must be positive finite');
  const g = new Array(residuals.length);
  for (let i = 0; i < residuals.length; i++) {
    const r = residuals[i];
    if (!Number.isFinite(r)) throw new Error('huberGrad: non-finite residual');
    g[i] = huberGradElement(r, delta);
  }
  return g;
}
