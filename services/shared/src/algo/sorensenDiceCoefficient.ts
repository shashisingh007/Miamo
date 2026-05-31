export function sorensenDiceCoefficient<T>(a: Iterable<T>, b: Iterable<T>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) throw new Error('both sets empty');
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return (2 * inter) / (A.size + B.size);
}

export function sorensenDiceDistance<T>(a: Iterable<T>, b: Iterable<T>): number {
  return 1 - sorensenDiceCoefficient(a, b);
}
