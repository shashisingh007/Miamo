export interface FareyFraction {
  numerator: number;
  denominator: number;
}

export function fareySequence(n: number): FareyFraction[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError('n must be a positive integer');
  }
  const out: FareyFraction[] = [{ numerator: 0, denominator: 1 }];
  let a = 0;
  let b = 1;
  let c = 1;
  let d = n;
  while (c <= n) {
    out.push({ numerator: c, denominator: d });
    const k = Math.floor((n + b) / d);
    const nextC = k * c - a;
    const nextD = k * d - b;
    a = c;
    b = d;
    c = nextC;
    d = nextD;
  }
  return out;
}

export function fareyLength(n: number): number {
  return fareySequence(n).length;
}
