export function fisherYatesShuffle<T>(values: T[], rng: () => number = Math.random): T[] {
  const out = values.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const r = rng();
    if (!(r >= 0 && r < 1)) {
      throw new RangeError('rng must return values in [0, 1)');
    }
    const j = Math.floor(r * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seededRng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    const u = (s >>> 0) / 0x100000000;
    return u;
  };
}
