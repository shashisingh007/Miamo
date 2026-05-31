// Permutation rank/unrank in lexicographic order over {0, 1, ..., n-1}.
// rank(p) returns the 0-based lex position of permutation p.
// unrank(n, r) returns the r-th permutation of {0..n-1} in lex order.
// Uses the factorial number system. Throws on invalid input.

function factorialList(n: number): bigint[] {
  const out: bigint[] = new Array(n + 1);
  out[0] = 1n;
  for (let i = 1; i <= n; i += 1) out[i] = out[i - 1] * BigInt(i);
  return out;
}

function assertPermutation(p: number[]): void {
  const seen = new Array<boolean>(p.length).fill(false);
  for (const x of p) {
    if (!Number.isInteger(x) || x < 0 || x >= p.length || seen[x]) {
      throw new Error('permutationRank: input is not a permutation of {0..n-1}');
    }
    seen[x] = true;
  }
}

export function permutationRank(p: number[]): bigint {
  if (!Array.isArray(p)) throw new Error('permutationRank: input must be array');
  assertPermutation(p);
  const n = p.length;
  if (n === 0) return 0n;
  const fact = factorialList(n);
  let rank = 0n;
  const available: number[] = [];
  for (let i = 0; i < n; i += 1) available.push(i);
  for (let i = 0; i < n; i += 1) {
    const idx = available.indexOf(p[i]);
    rank += BigInt(idx) * fact[n - 1 - i];
    available.splice(idx, 1);
  }
  return rank;
}

export function permutationUnrank(n: number, rank: bigint | number): number[] {
  if (!Number.isInteger(n) || n < 0) throw new Error('permutationUnrank: n must be non-negative integer');
  const r = typeof rank === 'bigint' ? rank : BigInt(rank);
  if (r < 0n) throw new Error('permutationUnrank: rank must be >= 0');
  const fact = factorialList(n);
  if (r >= fact[n]) throw new Error('permutationUnrank: rank out of range');
  const result: number[] = [];
  const available: number[] = [];
  for (let i = 0; i < n; i += 1) available.push(i);
  let remaining = r;
  for (let i = 0; i < n; i += 1) {
    const f = fact[n - 1 - i];
    const idx = Number(remaining / f);
    remaining = remaining % f;
    result.push(available[idx]);
    available.splice(idx, 1);
  }
  return result;
}

export function permutationRankUnrank() {
  return { permutationRank, permutationUnrank };
}
