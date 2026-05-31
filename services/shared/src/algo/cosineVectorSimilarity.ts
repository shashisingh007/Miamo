// Cosine similarity for dense numeric vectors and sparse string-keyed vectors.

export function cosineVectorSimilarity(
  a: ReadonlyArray<number>,
  b: ReadonlyArray<number>
): number {
  if (!Array.isArray(a) || !Array.isArray(b)) throw new TypeError('inputs must be arrays');
  if (a.length !== b.length) throw new Error('vectors must have equal length');
  if (a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new TypeError('vectors must contain numbers');
    }
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function cosineSparseSimilarity(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>
): number {
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    throw new TypeError('inputs must be objects');
  }
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const k of Object.keys(a)) {
    const x = a[k];
    if (typeof x !== 'number') throw new TypeError('values must be numbers');
    na += x * x;
    if (k in b) {
      const y = b[k];
      if (typeof y !== 'number') throw new TypeError('values must be numbers');
      dot += x * y;
    }
  }
  for (const k of Object.keys(b)) {
    const y = b[k];
    if (typeof y !== 'number') throw new TypeError('values must be numbers');
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
