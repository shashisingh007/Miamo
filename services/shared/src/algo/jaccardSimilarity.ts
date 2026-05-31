export function jaccardSimilarity<T>(a: Iterable<T>, b: Iterable<T>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) throw new Error('both sets empty');
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return inter / union;
}

export function jaccardDistance<T>(a: Iterable<T>, b: Iterable<T>): number {
  return 1 - jaccardSimilarity(a, b);
}
