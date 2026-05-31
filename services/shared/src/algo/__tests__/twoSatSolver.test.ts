import { describe, it, expect } from 'vitest';
import { twoSatSolver, TwoSatClause } from '../twoSatSolver';

function satisfies(clauses: TwoSatClause[], assignment: boolean[]): boolean {
  for (const c of clauses) {
    const valA = c.a >= 0 ? assignment[c.a] : !assignment[-c.a - 1];
    const valB = c.b >= 0 ? assignment[c.b] : !assignment[-c.b - 1];
    if (!valA && !valB) return false;
  }
  return true;
}

describe('twoSatSolver', () => {
  it('rejects bad variableCount', () => {
    expect(() => twoSatSolver({ variableCount: -1, clauses: [] })).toThrow(RangeError);
  });

  it('rejects bad clauses array', () => {
    expect(() => twoSatSolver({ variableCount: 1, clauses: 'x' as any })).toThrow(TypeError);
  });

  it('rejects bad literal index', () => {
    expect(() =>
      twoSatSolver({ variableCount: 2, clauses: [{ a: 5, b: 0 }] }),
    ).toThrow(RangeError);
  });

  it('empty clauses always SAT', () => {
    const r = twoSatSolver({ variableCount: 3, clauses: [] });
    expect(r.satisfiable).toBe(true);
    expect(r.assignment).toHaveLength(3);
  });

  it('zero variables SAT', () => {
    const r = twoSatSolver({ variableCount: 0, clauses: [] });
    expect(r.satisfiable).toBe(true);
    expect(r.assignment).toEqual([]);
  });

  it('single clause (x0 OR x1) is SAT', () => {
    const clauses: TwoSatClause[] = [{ a: 0, b: 1 }];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(true);
    expect(satisfies(clauses, r.assignment!)).toBe(true);
  });

  it('contradiction x0 AND ~x0 unsat', () => {
    // (x0 OR x0) AND (~x0 OR ~x0)
    const clauses: TwoSatClause[] = [
      { a: 0, b: 0 },
      { a: -1, b: -1 },
    ];
    const r = twoSatSolver({ variableCount: 1, clauses });
    expect(r.satisfiable).toBe(false);
  });

  it('classic chain SAT', () => {
    const clauses: TwoSatClause[] = [
      { a: 0, b: 1 },
      { a: -1, b: -2 },
      { a: 0, b: -2 },
    ];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(true);
    expect(satisfies(clauses, r.assignment!)).toBe(true);
  });

  it('implication forces value', () => {
    // (~x0 OR x1) AND (~x0 OR ~x1) AND (x0 OR x0)
    const clauses: TwoSatClause[] = [
      { a: -1, b: 1 },
      { a: -1, b: -2 },
      { a: 0, b: 0 },
    ];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(false);
  });

  it('all positive clauses SAT (set all true)', () => {
    const clauses: TwoSatClause[] = [
      { a: 0, b: 1 },
      { a: 1, b: 2 },
      { a: 2, b: 0 },
    ];
    const r = twoSatSolver({ variableCount: 3, clauses });
    expect(r.satisfiable).toBe(true);
    expect(satisfies(clauses, r.assignment!)).toBe(true);
  });

  it('all negative clauses SAT (set all false)', () => {
    const clauses: TwoSatClause[] = [
      { a: -1, b: -2 },
      { a: -2, b: -3 },
    ];
    const r = twoSatSolver({ variableCount: 3, clauses });
    expect(r.satisfiable).toBe(true);
    expect(satisfies(clauses, r.assignment!)).toBe(true);
  });

  it('unit clauses chain SAT', () => {
    const clauses: TwoSatClause[] = [
      { a: 0, b: 0 }, // forces x0=true
      { a: 1, b: -1 }, // (x1 OR ~x0); satisfied by x1 or ~x0; since x0 is true, must set x1=true
    ];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(true);
    expect(r.assignment![0]).toBe(true);
    expect(r.assignment![1]).toBe(true);
  });

  it('detects forced contradiction chain', () => {
    // (x0 OR x0), (~x0 OR x1), (~x0 OR ~x1)
    const clauses: TwoSatClause[] = [
      { a: 0, b: 0 },
      { a: -1, b: 1 },
      { a: -1, b: -2 },
    ];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(false);
  });

  it('random SAT instances always produce valid assignment', () => {
    const mkLit = (v: number, positive: boolean): number => (positive ? v : -v - 1);
    for (let trial = 0; trial < 10; trial += 1) {
      const n = 5;
      const truth = Array.from({ length: n }, () => Math.random() < 0.5);
      const clauses: TwoSatClause[] = [];
      for (let c = 0; c < 8; c += 1) {
        const i = Math.floor(Math.random() * n);
        let j = Math.floor(Math.random() * n);
        while (j === i) j = Math.floor(Math.random() * n);
        // satisfying literal for var i (matches truth[i])
        const litI = mkLit(i, truth[i]);
        // for the other side, pick any polarity; truth[i] already makes clause SAT
        const polJ = Math.random() < 0.5;
        const litJ = mkLit(j, polJ);
        clauses.push({ a: litI, b: litJ });
      }
      const r = twoSatSolver({ variableCount: n, clauses });
      expect(r.satisfiable).toBe(true);
      expect(satisfies(clauses, r.assignment!)).toBe(true);
    }
  });

  it('assignment length = variableCount', () => {
    const r = twoSatSolver({ variableCount: 5, clauses: [{ a: 0, b: 1 }] });
    expect(r.assignment).toHaveLength(5);
  });

  it('handles parallel clauses', () => {
    const clauses: TwoSatClause[] = [
      { a: 0, b: 1 },
      { a: 0, b: 1 },
    ];
    const r = twoSatSolver({ variableCount: 2, clauses });
    expect(r.satisfiable).toBe(true);
    expect(satisfies(clauses, r.assignment!)).toBe(true);
  });
});
