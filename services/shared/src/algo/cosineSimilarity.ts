function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a: readonly number[]): number {
  let s = 0;
  for (const v of a) s += v * v;
  return Math.sqrt(s);
}

function validate(a: readonly number[], name: string): void {
  if (a.length === 0) throw new Error(`${name} must be non-empty`);
  for (const v of a) if (!Number.isFinite(v)) throw new Error(`${name} entries must be finite`);
}

export function cosineSimilarity(
  a: readonly number[],
  b: readonly number[]
): number {
  if (a.length !== b.length) throw new Error('a and b must have equal length');
  validate(a, 'a');
  validate(b, 'b');
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) throw new Error('vectors must be non-zero');
  return dot(a, b) / (na * nb);
}

export function cosineDistance(
  a: readonly number[],
  b: readonly number[]
): number {
  return 1 - cosineSimilarity(a, b);
}
