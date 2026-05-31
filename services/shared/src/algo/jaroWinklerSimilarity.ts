// Jaro and Jaro-Winkler string similarity.

export function jaroSimilarity(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('inputs must be strings');
  }
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const matchDist = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array<boolean>(a.length).fill(false);
  const bMatches = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - matchDist);
    const hi = Math.min(b.length, i + matchDist + 1);
    for (let j = lo; j < hi; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  return (
    matches / a.length +
    matches / b.length +
    (matches - transpositions) / matches
  ) / 3;
}

export function jaroWinklerSimilarity(
  a: string,
  b: string,
  prefixScale = 0.1,
  maxPrefix = 4
): number {
  if (typeof prefixScale !== 'number' || prefixScale < 0 || prefixScale > 0.25) {
    throw new RangeError('prefixScale must be in [0, 0.25]');
  }
  if (!Number.isInteger(maxPrefix) || maxPrefix < 0) {
    throw new RangeError('maxPrefix must be a non-negative integer');
  }
  const j = jaroSimilarity(a, b);
  let prefix = 0;
  const limit = Math.min(maxPrefix, a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * prefixScale * (1 - j);
}
