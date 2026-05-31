// Gale-Shapley stable marriage. Each side has n participants; each provides a
// strict preference ranking over the opposite side. Result is a stable matching
// (no blocking pair). Proposers (e.g. men) get their proposer-optimal stable
// matching.

export interface StableMatchingResult {
  matchOfA: number[]; // matchOfA[i] = index in B paired with A[i]
  matchOfB: number[]; // matchOfB[j] = index in A paired with B[j]
}

export function galeShapley(prefsA: number[][], prefsB: number[][]): StableMatchingResult {
  if (!Array.isArray(prefsA) || !Array.isArray(prefsB)) {
    throw new Error('galeShapley: preferences must be arrays');
  }
  const n = prefsA.length;
  if (prefsB.length !== n) throw new Error('galeShapley: both sides must have equal size');
  for (const row of prefsA) {
    if (!Array.isArray(row) || row.length !== n) {
      throw new Error('galeShapley: each row of prefsA must list all n partners');
    }
  }
  for (const row of prefsB) {
    if (!Array.isArray(row) || row.length !== n) {
      throw new Error('galeShapley: each row of prefsB must list all n partners');
    }
  }
  // Build reverse-rank for B for O(1) preference lookup.
  const rankB: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let j = 0; j < n; j += 1) {
    for (let r = 0; r < n; r += 1) rankB[j][prefsB[j][r]] = r;
  }
  const matchOfA = new Array<number>(n).fill(-1);
  const matchOfB = new Array<number>(n).fill(-1);
  const next = new Array<number>(n).fill(0); // next[i] = next preference index to propose
  const free: number[] = [];
  for (let i = 0; i < n; i += 1) free.push(i);
  while (free.length > 0) {
    const i = free.pop()!;
    if (next[i] >= n) continue;
    const j = prefsA[i][next[i]];
    next[i] += 1;
    if (matchOfB[j] === -1) {
      matchOfA[i] = j;
      matchOfB[j] = i;
    } else {
      const cur = matchOfB[j];
      if (rankB[j][i] < rankB[j][cur]) {
        matchOfA[i] = j;
        matchOfB[j] = i;
        matchOfA[cur] = -1;
        free.push(cur);
      } else {
        free.push(i);
      }
    }
  }
  return { matchOfA, matchOfB };
}

export function isStableMatching(
  prefsA: number[][],
  prefsB: number[][],
  res: StableMatchingResult,
): boolean {
  const n = prefsA.length;
  const rankA: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const rankB: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i += 1) for (let r = 0; r < n; r += 1) rankA[i][prefsA[i][r]] = r;
  for (let j = 0; j < n; j += 1) for (let r = 0; r < n; r += 1) rankB[j][prefsB[j][r]] = r;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (j === res.matchOfA[i]) continue;
      const iPartner = res.matchOfA[i];
      const jPartner = res.matchOfB[j];
      if (rankA[i][j] < rankA[i][iPartner] && rankB[j][i] < rankB[j][jPartner]) {
        return false; // blocking pair
      }
    }
  }
  return true;
}

export function stableMarriageGaleShapley() {
  return { galeShapley, isStableMatching };
}
