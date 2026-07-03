/**
 * abVariant — Phase 11 deterministic A/B variant picker.
 *
 * Hashes an opaque key (typically `userIdHash + experimentId`) into a stable
 * bucket. Same input → same bucket forever (FNV-1a, no salt). Use this for
 * reason-chip copy variants, nudge-format experiments, and any other UI
 * variant decision that must be stable per user across sessions.
 *
 * Pure & sync. No crypto — buckets are not security-sensitive.
 *
 * Bucket selection is weighted: each variant carries a non-negative weight
 * and the picker scales the hash into [0, totalWeight). Equal weights ⇒
 * uniform split. Weights of [3, 1] ⇒ 75/25 split.
 */
export type Variant<T extends string = string> = {
  id: T;
  weight: number;
};

/**
 * FNV-1a 32-bit hash. Stable, fast, and dependency-free.
 */
export function hashKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    // h * 16777619, kept in 32-bit range
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function pickVariant<T extends string>(
  key: string,
  variants: readonly Variant<T>[],
): T {
  if (!variants || variants.length === 0) {
    throw new Error('pickVariant: variants must be non-empty');
  }
  let total = 0;
  for (const v of variants) {
    if (!Number.isFinite(v.weight) || v.weight < 0) {
      throw new Error(`pickVariant: invalid weight for ${v.id}`);
    }
    total += v.weight;
  }
  if (total <= 0) {
    // All-zero weights: deterministic fall-through to first variant.
    return variants[0].id;
  }
  // Hash → [0, 1) → [0, total)
  const h = hashKey(key);
  const norm = h / 0x1_0000_0000;
  const point = norm * total;
  let acc = 0;
  for (const v of variants) {
    acc += v.weight;
    if (point < acc) return v.id;
  }
  // Numerical edge: return last.
  return variants[variants.length - 1].id;
}

/**
 * Convenience for the most common case: 2 equally-weighted variants.
 */
export function pickAB<T extends string>(key: string, a: T, b: T): T {
  return pickVariant(key, [{ id: a, weight: 1 }, { id: b, weight: 1 }]);
}
