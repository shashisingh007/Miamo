// 2-SAT solver: given a CNF of 2-clauses over n boolean variables, decide
// satisfiability and produce a satisfying assignment if one exists.
// Uses implication graph + SCC; literal i in [0, 2n) encodes (var i>>1) with
// polarity (i & 1 ? negated : positive). For input we use signed indices:
// positive integer k means x_k = true; negative means x_k = false. Variables
// are 0..n-1.

export interface TwoSatClause {
  a: number; // signed literal: index ∈ [0, n) means var=true; negative means var=false; use ~i for -0
  b: number;
}

export interface TwoSatProblem {
  variableCount: number;
  clauses: ReadonlyArray<TwoSatClause>;
}

export interface TwoSatResult {
  satisfiable: boolean;
  assignment?: boolean[];
}

function encodeLit(lit: number, n: number): number {
  // lit is a signed literal index: 0..n-1 = positive, -1..-n = negative
  // map to 2-vertex space: positive var v -> 2v, negative -> 2v+1
  if (lit >= 0) {
    if (lit >= n) throw new RangeError(`literal ${lit} out of range`);
    return 2 * lit;
  }
  const v = -lit - 1;
  if (v < 0 || v >= n) throw new RangeError(`literal ${lit} out of range`);
  return 2 * v + 1;
}

function negate(enc: number): number {
  return enc ^ 1;
}

export function twoSatSolver(problem: TwoSatProblem): TwoSatResult {
  if (!problem || !Number.isInteger(problem.variableCount) || problem.variableCount < 0) {
    throw new RangeError('variableCount must be a non-negative integer');
  }
  if (!Array.isArray(problem.clauses)) throw new TypeError('clauses must be an array');
  const n = problem.variableCount;
  const V = 2 * n;
  const adj: number[][] = Array.from({ length: V }, () => []);
  for (const cl of problem.clauses) {
    const a = encodeLit(cl.a, n);
    const b = encodeLit(cl.b, n);
    // (a OR b) <=> (~a -> b) AND (~b -> a)
    adj[negate(a)].push(b);
    adj[negate(b)].push(a);
  }
  // Kosaraju SCC
  const order: number[] = [];
  const visited = new Array<boolean>(V).fill(false);
  for (let start = 0; start < V; start += 1) {
    if (visited[start]) continue;
    const stack: { v: number; iter: number }[] = [{ v: start, iter: 0 }];
    visited[start] = true;
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.iter < adj[top.v].length) {
        const w = adj[top.v][top.iter];
        top.iter += 1;
        if (!visited[w]) {
          visited[w] = true;
          stack.push({ v: w, iter: 0 });
        }
      } else {
        order.push(top.v);
        stack.pop();
      }
    }
  }
  const radj: number[][] = Array.from({ length: V }, () => []);
  for (let v = 0; v < V; v += 1) for (const w of adj[v]) radj[w].push(v);
  const comp = new Array<number>(V).fill(-1);
  let cid = 0;
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const start = order[i];
    if (comp[start] !== -1) continue;
    const stack = [start];
    comp[start] = cid;
    while (stack.length) {
      const v = stack.pop()!;
      for (const w of radj[v]) {
        if (comp[w] === -1) {
          comp[w] = cid;
          stack.push(w);
        }
      }
    }
    cid += 1;
  }
  const assignment = new Array<boolean>(n);
  for (let v = 0; v < n; v += 1) {
    if (comp[2 * v] === comp[2 * v + 1]) return { satisfiable: false };
    // standard 2-SAT: var = (comp[positive] > comp[negative])
    assignment[v] = comp[2 * v] > comp[2 * v + 1];
  }
  return { satisfiable: true, assignment };
}
