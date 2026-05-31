// Hopcroft's DFA minimization via partition-refinement worklist.
// Returns a minimized DFA, dropping unreachable states first.

export interface HopDfa {
  states: number;
  alphabet: string[];
  start: number;
  accepts: Set<number>;
  transitions: Record<number, Record<string, number>>;
}

function reachable(dfa: HopDfa): Set<number> {
  const seen = new Set<number>([dfa.start]);
  const stack = [dfa.start];
  while (stack.length) {
    const s = stack.pop()!;
    for (const c of dfa.alphabet) {
      const t = dfa.transitions[s]?.[c];
      if (t !== undefined && !seen.has(t)) {
        seen.add(t);
        stack.push(t);
      }
    }
  }
  return seen;
}

export function hopcroftMinimize(dfa: HopDfa): HopDfa {
  const reach = reachable(dfa);
  const F = new Set<number>();
  const Q = new Set<number>();
  for (const s of reach) {
    Q.add(s);
    if (dfa.accepts.has(s)) F.add(s);
  }
  const NF = new Set<number>();
  for (const s of Q) if (!F.has(s)) NF.add(s);

  const partitions: Set<number>[] = [];
  if (F.size > 0) partitions.push(F);
  if (NF.size > 0) partitions.push(NF);

  // Inverse-transition map: pre[c][t] = set of states with t = δ(s,c).
  const pre = new Map<string, Map<number, Set<number>>>();
  for (const c of dfa.alphabet) pre.set(c, new Map());
  for (const s of Q) {
    for (const c of dfa.alphabet) {
      const t = dfa.transitions[s]?.[c];
      if (t === undefined || !Q.has(t)) continue;
      const m = pre.get(c)!;
      let set = m.get(t);
      if (!set) {
        set = new Set();
        m.set(t, set);
      }
      set.add(s);
    }
  }

  // Worklist: indices into partitions.
  const work: Set<number> = new Set();
  partitions.forEach((_p, i) => work.add(i));

  while (work.size > 0) {
    const Aidx = work.values().next().value as number;
    work.delete(Aidx);
    const A = partitions[Aidx];

    for (const c of dfa.alphabet) {
      // X = states s with δ(s, c) ∈ A
      const X = new Set<number>();
      const m = pre.get(c)!;
      for (const t of A) {
        const set = m.get(t);
        if (set) for (const s of set) X.add(s);
      }
      if (X.size === 0) continue;

      // For each partition Y, split Y = (Y ∩ X) ∪ (Y \ X) if both non-empty.
      for (let i = partitions.length - 1; i >= 0; i--) {
        const Y = partitions[i];
        const inter = new Set<number>();
        const diff = new Set<number>();
        for (const s of Y) (X.has(s) ? inter : diff).add(s);
        if (inter.size === 0 || diff.size === 0) continue;
        partitions[i] = inter;
        partitions.push(diff);
        const newIdx = partitions.length - 1;
        if (work.has(i)) {
          work.add(newIdx);
        } else if (inter.size <= diff.size) {
          work.add(i);
        } else {
          work.add(newIdx);
        }
      }
    }
  }

  // Build minimized DFA.
  const classOf = new Map<number, number>();
  partitions.forEach((p, i) => p.forEach((s) => classOf.set(s, i)));
  const newStates = partitions.length;
  const newAccepts = new Set<number>();
  const newTrans: Record<number, Record<string, number>> = {};
  for (let i = 0; i < newStates; i++) {
    const rep = partitions[i].values().next().value as number;
    if (dfa.accepts.has(rep)) newAccepts.add(i);
    newTrans[i] = {};
    for (const c of dfa.alphabet) {
      const t = dfa.transitions[rep]?.[c];
      if (t !== undefined) {
        const cls = classOf.get(t);
        if (cls !== undefined) newTrans[i][c] = cls;
      }
    }
  }
  return {
    states: newStates,
    alphabet: dfa.alphabet,
    start: classOf.get(dfa.start) as number,
    accepts: newAccepts,
    transitions: newTrans,
  };
}

export function hopAccepts(dfa: HopDfa, input: string[]): boolean {
  let cur: number | undefined = dfa.start;
  for (const c of input) {
    if (cur === undefined) return false;
    cur = dfa.transitions[cur]?.[c];
  }
  return cur !== undefined && dfa.accepts.has(cur);
}
