// Earley parser for general context-free grammars (no need for CNF).
// Productions are { lhs: string, rhs: string[] }. Terminals must be tagged
// distinctly from non-terminals: any symbol matching a token is treated as a
// terminal if it is not declared as the LHS of any rule.

export interface EarleyProduction {
  lhs: string;
  rhs: string[];
}

export interface EarleyGrammar {
  start: string;
  productions: EarleyProduction[];
}

interface Item {
  rule: number; // index into productions
  dot: number; // position of dot in rhs
  origin: number; // index of chart position where this item started
}

function itemKey(it: Item): string {
  return `${it.rule}|${it.dot}|${it.origin}`;
}

export function earleyAccepts(grammar: EarleyGrammar, tokens: string[]): boolean {
  const productions = grammar.productions;
  const lhsSet = new Set(productions.map((p) => p.lhs));
  const byLhs = new Map<string, number[]>();
  productions.forEach((p, i) => {
    let arr = byLhs.get(p.lhs);
    if (!arr) {
      arr = [];
      byLhs.set(p.lhs, arr);
    }
    arr.push(i);
  });

  const n = tokens.length;
  const charts: Item[][] = Array.from({ length: n + 1 }, () => []);
  const seen: Set<string>[] = Array.from({ length: n + 1 }, () => new Set());

  function addItem(pos: number, it: Item) {
    const k = itemKey(it);
    if (seen[pos].has(k)) return;
    seen[pos].add(k);
    charts[pos].push(it);
  }

  // Seed: every production with lhs === start at chart 0.
  for (const idx of byLhs.get(grammar.start) ?? []) {
    addItem(0, { rule: idx, dot: 0, origin: 0 });
  }

  for (let i = 0; i <= n; i++) {
    // charts[i] grows during iteration; iterate by index.
    for (let k = 0; k < charts[i].length; k++) {
      const it = charts[i][k];
      const prod = productions[it.rule];
      if (it.dot < prod.rhs.length) {
        const next = prod.rhs[it.dot];
        if (lhsSet.has(next)) {
          // Predict
          for (const idx of byLhs.get(next) ?? []) {
            addItem(i, { rule: idx, dot: 0, origin: i });
          }
        } else if (i < n && tokens[i] === next) {
          // Scan
          addItem(i + 1, { rule: it.rule, dot: it.dot + 1, origin: it.origin });
        }
      } else {
        // Complete
        for (const parent of charts[it.origin]) {
          const pp = productions[parent.rule];
          if (pp.rhs[parent.dot] === prod.lhs) {
            addItem(i, { rule: parent.rule, dot: parent.dot + 1, origin: parent.origin });
          }
        }
      }
    }
  }

  for (const it of charts[n]) {
    const prod = productions[it.rule];
    if (
      it.origin === 0 &&
      prod.lhs === grammar.start &&
      it.dot === prod.rhs.length
    ) {
      return true;
    }
  }
  return false;
}
