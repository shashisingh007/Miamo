// Numerically stable sigmoid: sigmoid(x) = 1/(1+exp(-x)).
// Logit: logit(p) = log(p/(1-p)) for 0 < p < 1, with optional eps clamping.

export function sigmoidStable(x: number): number {
  if (!Number.isFinite(x)) {
    if (x === Infinity) return 1;
    if (x === -Infinity) return 0;
    throw new Error('sigmoidStable: NaN');
  }
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

export function logit(p: number, eps: number = 0): number {
  if (!Number.isFinite(p)) throw new Error('logit: non-finite');
  if (!Number.isFinite(eps) || eps < 0 || eps >= 0.5) throw new Error('logit: invalid eps');
  let q = p;
  if (eps > 0) {
    q = Math.min(Math.max(p, eps), 1 - eps);
  } else {
    if (p <= 0 || p >= 1) throw new Error('logit: p must be in (0,1) when eps=0');
  }
  return Math.log(q / (1 - q));
}

export function sigmoidStableLogit(x: number): number {
  // Round-trip helper: returns sigmoid(x). Provided as a named export
  // for callers that want a single import for the stable family.
  return sigmoidStable(x);
}
