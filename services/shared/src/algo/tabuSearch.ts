export interface TabuSearchOptions<S> {
  neighbors: (state: S) => S[];
  energy: (state: S) => number;
  initial: S;
  tabuSize: number;
  maxIterations: number;
  key?: (state: S) => string;
}

export interface TabuSearchResult<S> {
  bestState: S;
  bestEnergy: number;
  iterations: number;
}

export function tabuSearch<S>(opts: TabuSearchOptions<S>): TabuSearchResult<S> {
  if (opts.tabuSize < 0) throw new RangeError('tabuSize must be >= 0');
  if (opts.maxIterations < 0) throw new RangeError('maxIterations must be >= 0');
  const key = opts.key ?? ((s: S) => JSON.stringify(s));
  let current = opts.initial;
  let best = current;
  let bestE = opts.energy(current);
  const tabuQueue: string[] = [];
  const tabuSet = new Set<string>();
  tabuQueue.push(key(current));
  tabuSet.add(key(current));

  let i = 0;
  for (; i < opts.maxIterations; i++) {
    const candidates = opts.neighbors(current);
    if (candidates.length === 0) break;
    let chosen: S | null = null;
    let chosenE = Infinity;
    for (const c of candidates) {
      const k = key(c);
      const e = opts.energy(c);
      const allowed = !tabuSet.has(k) || e < bestE;
      if (allowed && e < chosenE) {
        chosen = c;
        chosenE = e;
      }
    }
    if (chosen === null) break;
    current = chosen;
    const ck = key(chosen);
    if (!tabuSet.has(ck)) {
      tabuQueue.push(ck);
      tabuSet.add(ck);
      while (tabuQueue.length > opts.tabuSize) {
        const old = tabuQueue.shift()!;
        tabuSet.delete(old);
      }
    }
    if (chosenE < bestE) {
      best = chosen;
      bestE = chosenE;
    }
  }
  return { bestState: best, bestEnergy: bestE, iterations: i };
}
