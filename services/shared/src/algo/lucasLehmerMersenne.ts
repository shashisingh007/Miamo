export function isMersennePrime(p: number): boolean {
  if (!Number.isInteger(p) || p < 2) {
    throw new RangeError('p must be an integer >= 2');
  }
  if (p === 2) return true;
  if (p % 2 === 0) return false;
  for (let f = 3; f * f <= p; f += 2) {
    if (p % f === 0) return false;
  }
  const m = (1n << BigInt(p)) - 1n;
  let s = 4n;
  for (let i = 0; i < p - 2; i += 1) {
    s = ((s * s) - 2n) % m;
    if (s < 0n) s += m;
  }
  return s === 0n;
}
