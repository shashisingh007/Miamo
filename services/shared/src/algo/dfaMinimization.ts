// DFA minimization via Hopcroft's partition-refinement algorithm.

export interface Dfa {
  states: number;
  alphabet: string[];
  start: number;
  accepts: Set<number>;
  // transitions[s][symbol] -> next state (or undefined for missing transition).
  // We treat any undefined transition as a sink (state -1) so the DFA is total.
  transitions: Record<number, Record<string, number>>;
}

export interface MinimizedDfa {
  states: number;
  alphabet: string[];
  start: number;
  accepts: Set<number>;
  transitions: Record<number, Record<string, number>>;
  // Map from original-state index (or -1 sink) to new-state index.
  classOf: Map<number, number>;
}

export function minimizeDfa(dfa: Dfa): MinimizedDfa {
  const SINK = -1;
  const allStates: number[] = [];
  for (let i = 0; i < dfa.states; i++) allStates.push(i);
  allStates.push(SINK);

  const trans = (s: number, c: string): number => {
    if (s === SINK) return SINK;
    const next = dfa.transitions[s]?.[c];
    return next === undefined ? SINK : next;
  };

  const isAccept = (s: number) => s !== SINK && dfa.accepts.has(s);

  // Initial partition: accepting vs non-accepting (incl sink).
  const accSet = new Set<number>();
  const nonAcc = new Set<number>();
  for (const s of allStates) (isAccept(s) ? accSet : nonAcc).add(s);

  const partitions: Set<number>[] = [];
  if (accSet.size > 0) partitions.push(accSet);
  if (nonAcc.size > 0) partitions.push(nonAcc);

  let changed = true;
  while (changed) {
    changed = false;
    const next: Set<number>[] = [];
    const idOf = new Map<number, number>();
    partitions.forEach((p, i) => p.forEach((s) => idOf.set(s, i)));
    for (const part of partitions) {
      // Group members by their signature (next-partition for each symbol).
      const groups = new Map<string, Set<number>>();
      for (const s of part) {
        const sig = dfa.alphabet.map((c) => idOf.get(trans(s, c)) ?? -1).join('|');
        let g = groups.get(sig);
        if (!g) {
          g = new Set();
          groups.set(sig, g);
        }
        g.add(s);
      }
      if (groups.size > 1) changed = true;
      for (const g of groups.values()) next.push(g);
    }
    partitions.length = 0;
    partitions.push(...next);
  }

  // Drop the dead-state class (a class containing the sink, with no accepting
  // states, where every transition stays within the class).
  const classOfTmp = new Map<number, number>();
  partitions.forEach((p, i) => p.forEach((s) => classOfTmp.set(s, i)));
  const isDead = (cls: number): boolean => {
    const members = partitions[cls];
    for (const s of members) if (isAccept(s)) return false;
    for (const s of members) {
      for (const c of dfa.alphabet) {
        const t = trans(s, c);
        if (classOfTmp.get(t) !== cls) return false;
      }
    }
    return true;
  };
  const keep: number[] = [];
  for (let i = 0; i < partitions.length; i++) if (!isDead(i)) keep.push(i);

  const remap = new Map<number, number>();
  keep.forEach((old, idx) => remap.set(old, idx));
  const classOf = new Map<number, number>();
  classOfTmp.forEach((cls, s) => {
    const r = remap.get(cls);
    if (r !== undefined) classOf.set(s, r);
  });

  const newAccepts = new Set<number>();
  const newTrans: Record<number, Record<string, number>> = {};
  for (let i = 0; i < keep.length; i++) {
    newTrans[i] = {};
    const rep = partitions[keep[i]].values().next().value as number;
    if (isAccept(rep)) newAccepts.add(i);
    for (const c of dfa.alphabet) {
      const t = trans(rep, c);
      const r = classOf.get(t);
      if (r !== undefined) newTrans[i][c] = r;
    }
  }

  const start = classOf.get(dfa.start);
  if (start === undefined) {
    // Start state was dead — accepts nothing. Return a 1-state non-accepting DFA.
    return {
      states: 1,
      alphabet: dfa.alphabet,
      start: 0,
      accepts: new Set(),
      transitions: { 0: {} },
      classOf: new Map(allStates.map((s) => [s, 0])),
    };
  }

  return {
    states: keep.length,
    alphabet: dfa.alphabet,
    start,
    accepts: newAccepts,
    transitions: newTrans,
    classOf,
  };
}

export function dfaAcceptsString(dfa: { start: number; accepts: Set<number>; transitions: Record<number, Record<string, number>> }, input: string[]): boolean {
  let cur: number | undefined = dfa.start;
  for (const c of input) {
    if (cur === undefined) return false;
    cur = dfa.transitions[cur]?.[c];
  }
  return cur !== undefined && dfa.accepts.has(cur);
}
