export function sokalSneathDistance<T>(a: Iterable<T>, b: Iterable<T>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) throw new Error('both sets empty');
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const onlyA = A.size - inter;
  const onlyB = B.size - inter;
  const num = 2 * (onlyA + onlyB);
  const den = inter + num;
  if (den === 0) return 0;
  return num / den;
}

export function sokalSneathSimilarity<T>(a: Iterable<T>, b: Iterable<T>): number {
  return 1 - sokalSneathDistance(a, b);
}
