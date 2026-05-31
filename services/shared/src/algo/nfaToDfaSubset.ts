// Subset construction: convert an NFA (with optional epsilon transitions) into
// an equivalent DFA. States are subsets of NFA states. Symbols are arbitrary
// strings; epsilon is represented by the empty string ''.

export interface NFA {
  start: number;
  accept: Set<number>;
  // transitions[state] is array of [symbol, target] (symbol === '' for epsilon)
  transitions: Array<Array<[string, number]>>;
}

export interface DFA {
  start: number;
  accept: Set<number>;
  // For each DFA state, map of symbol -> next DFA state index
  transitions: Array<Map<string, number>>;
  // For each DFA state, the set of NFA states it represents (for inspection).
  stateSets: number[][];
}

function epsilonClosure(nfa: NFA, states: Set<number>): Set<number> {
  const stack = Array.from(states);
  const closed = new Set(states);
  while (stack.length > 0) {
    const s = stack.pop()!;
    for (const [sym, t] of nfa.transitions[s] ?? []) {
      if (sym === '' && !closed.has(t)) {
        closed.add(t);
        stack.push(t);
      }
    }
  }
  return closed;
}

function move(nfa: NFA, states: Set<number>, sym: string): Set<number> {
  const out = new Set<number>();
  for (const s of states) {
    for (const [t, target] of nfa.transitions[s] ?? []) {
      if (t === sym) out.add(target);
    }
  }
  return out;
}

function setKey(states: Set<number>): string {
  return Array.from(states).sort((a, b) => a - b).join(',');
}

export function nfaToDfa(nfa: NFA): DFA {
  if (!nfa || typeof nfa !== 'object') throw new Error('nfaToDfa: nfa required');
  if (!Array.isArray(nfa.transitions)) throw new Error('nfaToDfa: transitions must be array');
  const startSet = epsilonClosure(nfa, new Set([nfa.start]));
  const stateMap = new Map<string, number>();
  const stateSets: number[][] = [];
  const transitions: Array<Map<string, number>> = [];
  const accept = new Set<number>();
  const queue: Array<{ idx: number; set: Set<number> }> = [];
  function getOrCreate(set: Set<number>): number {
    const key = setKey(set);
    let idx = stateMap.get(key);
    if (idx !== undefined) return idx;
    idx = stateSets.length;
    stateMap.set(key, idx);
    stateSets.push(Array.from(set).sort((a, b) => a - b));
    transitions.push(new Map());
    for (const s of set) if (nfa.accept.has(s)) accept.add(idx);
    queue.push({ idx, set });
    return idx;
  }
  const startIdx = getOrCreate(startSet);
  // Collect all input symbols (non-epsilon).
  const symbols = new Set<string>();
  for (const row of nfa.transitions) {
    for (const [sym] of row ?? []) if (sym !== '') symbols.add(sym);
  }
  while (queue.length > 0) {
    const { idx, set } = queue.shift()!;
    for (const sym of symbols) {
      const moved = move(nfa, set, sym);
      if (moved.size === 0) continue;
      const closed = epsilonClosure(nfa, moved);
      const target = getOrCreate(closed);
      transitions[idx].set(sym, target);
    }
  }
  return { start: startIdx, accept, transitions, stateSets };
}

export function dfaAccepts(dfa: DFA, input: string[]): boolean {
  if (!Array.isArray(input)) throw new Error('dfaAccepts: input must be array of symbols');
  let s = dfa.start;
  for (const sym of input) {
    const next = dfa.transitions[s].get(sym);
    if (next === undefined) return false;
    s = next;
  }
  return dfa.accept.has(s);
}

export function nfaToDfaSubset() {
  return { nfaToDfa, dfaAccepts };
}
