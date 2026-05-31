// Brzozowski's DFA minimization algorithm: reverse + determinize, twice.
// Input/output DFAs use the same shape as `dfaMinimization.Dfa`.

export interface BrzDfa {
  states: number;
  alphabet: string[];
  start: number;
  accepts: Set<number>;
  transitions: Record<number, Record<string, number>>;
}

interface Nfa {
  states: number;
  alphabet: string[];
  starts: Set<number>;
  accepts: Set<number>;
  // transitions[s][c] -> set of next states
  transitions: Map<number, Map<string, Set<number>>>;
}

function reverseDfaToNfa(dfa: BrzDfa): Nfa {
  const trans = new Map<number, Map<string, Set<number>>>();
  for (let s = 0; s < dfa.states; s++) trans.set(s, new Map());
  for (let s = 0; s < dfa.states; s++) {
    const row = dfa.transitions[s] ?? {};
    for (const c of dfa.alphabet) {
      const t = row[c];
      if (t === undefined) continue;
      // edge s --c--> t becomes t --c--> s
      let m = trans.get(t)!;
      let set = m.get(c);
      if (!set) {
        set = new Set();
        m.set(c, set);
      }
      set.add(s);
    }
  }
  return {
    states: dfa.states,
    alphabet: dfa.alphabet,
    starts: new Set(dfa.accepts),
    accepts: new Set([dfa.start]),
    transitions: trans,
  };
}

function nfaSubsetToDfa(nfa: Nfa): BrzDfa {
  const subsets: number[][] = [];
  const subsetIndex = new Map<string, number>();
  const startKey = [...nfa.starts].sort((a, b) => a - b);
  const startK = startKey.join(',');
  subsets.push(startKey);
  subsetIndex.set(startK, 0);

  const trans: Record<number, Record<string, number>> = {};
  const accepts = new Set<number>();
  const queue: number[] = [0];
  while (queue.length) {
    const idx = queue.shift()!;
    const subset = subsets[idx];
    trans[idx] = {};
    for (const s of subset) if (nfa.accepts.has(s)) accepts.add(idx);
    for (const c of nfa.alphabet) {
      const next = new Set<number>();
      for (const s of subset) {
        const m = nfa.transitions.get(s);
        if (!m) continue;
        const set = m.get(c);
        if (!set) continue;
        for (const t of set) next.add(t);
      }
      if (next.size === 0) continue;
      const key = [...next].sort((a, b) => a - b);
      const k = key.join(',');
      let nIdx = subsetIndex.get(k);
      if (nIdx === undefined) {
        nIdx = subsets.length;
        subsetIndex.set(k, nIdx);
        subsets.push(key);
        queue.push(nIdx);
      }
      trans[idx][c] = nIdx;
    }
  }

  return {
    states: subsets.length,
    alphabet: nfa.alphabet,
    start: 0,
    accepts,
    transitions: trans,
  };
}

export function brzozowskiMinimize(dfa: BrzDfa): BrzDfa {
  const nfa1 = reverseDfaToNfa(dfa);
  const dfa1 = nfaSubsetToDfa(nfa1);
  const nfa2 = reverseDfaToNfa(dfa1);
  return nfaSubsetToDfa(nfa2);
}

export function brzAccepts(dfa: BrzDfa, input: string[]): boolean {
  let cur: number | undefined = dfa.start;
  for (const c of input) {
    if (cur === undefined) return false;
    cur = dfa.transitions[cur]?.[c];
  }
  return cur !== undefined && dfa.accepts.has(cur);
}
