// CYK parser for context-free grammars in Chomsky Normal Form (CNF).
// Productions are either:
//   - A -> B C  (two non-terminals), or
//   - A -> "t"  (single terminal token)

export type CnfRule =
  | { lhs: string; rhs: [string, string] }
  | { lhs: string; rhs: string };

export interface CnfGrammar {
  start: string;
  rules: CnfRule[];
}

export function cykParse(grammar: CnfGrammar, tokens: string[]): boolean {
  const n = tokens.length;
  if (n === 0) return false;

  const terminalRules = new Map<string, Set<string>>(); // token -> lhs set
  const binaryRules: { lhs: string; b: string; c: string }[] = [];
  for (const r of grammar.rules) {
    if (typeof r.rhs === 'string') {
      let s = terminalRules.get(r.rhs);
      if (!s) {
        s = new Set();
        terminalRules.set(r.rhs, s);
      }
      s.add(r.lhs);
    } else {
      binaryRules.push({ lhs: r.lhs, b: r.rhs[0], c: r.rhs[1] });
    }
  }

  // table[i][j] = set of non-terminals that derive tokens[i..i+j].
  const table: Set<string>[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => new Set<string>())
  );

  for (let i = 0; i < n; i++) {
    const lhsSet = terminalRules.get(tokens[i]);
    if (lhsSet) for (const a of lhsSet) table[i][0].add(a);
  }

  for (let len = 2; len <= n; len++) {
    for (let i = 0; i + len <= n; i++) {
      for (let split = 1; split < len; split++) {
        const left = table[i][split - 1];
        const right = table[i + split][len - split - 1];
        if (left.size === 0 || right.size === 0) continue;
        for (const r of binaryRules) {
          if (left.has(r.b) && right.has(r.c)) table[i][len - 1].add(r.lhs);
        }
      }
    }
  }

  return table[0][n - 1].has(grammar.start);
}
