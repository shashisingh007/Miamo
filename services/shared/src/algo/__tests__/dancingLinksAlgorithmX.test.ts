import { describe, it, expect } from 'vitest';
import { dancingLinksAlgorithmX } from '../dancingLinksAlgorithmX';

function isExactCover(rows: number[], allRows: number[][], C: number): boolean {
  const count = new Array<number>(C).fill(0);
  for (const r of rows) for (const c of allRows[r]) count[c] += 1;
  for (let i = 0; i < C; i += 1) if (count[i] !== 1) return false;
  return true;
}

describe('dancingLinksAlgorithmX', () => {
  it('rejects bad columnCount', () => {
    expect(() =>
      dancingLinksAlgorithmX({ columnCount: -1, rows: [] }),
    ).toThrow(RangeError);
  });

  it('rejects bad rows type', () => {
    expect(() =>
      dancingLinksAlgorithmX({ columnCount: 1, rows: 'x' as any }),
    ).toThrow(TypeError);
  });

  it('rejects bad column index in row', () => {
    expect(() =>
      dancingLinksAlgorithmX({ columnCount: 2, rows: [[5]] }),
    ).toThrow(RangeError);
  });

  it('zero columns with empty rows = empty cover', () => {
    const r = dancingLinksAlgorithmX({ columnCount: 0, rows: [] });
    expect(r).toEqual({ rows: [] });
  });

  it('no rows with positive columns = null', () => {
    const r = dancingLinksAlgorithmX({ columnCount: 2, rows: [] });
    expect(r).toBeNull();
  });

  it('single row covering all = picks it', () => {
    const r = dancingLinksAlgorithmX({ columnCount: 3, rows: [[0, 1, 2]] });
    expect(r).toEqual({ rows: [0] });
  });

  it('two disjoint rows cover', () => {
    const r = dancingLinksAlgorithmX({
      columnCount: 4,
      rows: [[0, 1], [2, 3]],
    });
    expect(r).toEqual({ rows: [0, 1] });
  });

  it('overlapping rows: returns valid cover', () => {
    const rows = [[0, 1], [1, 2], [0, 2]];
    const r = dancingLinksAlgorithmX({ columnCount: 3, rows });
    expect(r).toBeNull();
  });

  it("classic Knuth example", () => {
    // From Knuth's Algorithm X paper: 7 columns, 6 rows
    const rows = [
      [0, 3, 6], // A
      [0, 3], // B
      [3, 4, 6], // C
      [2, 4, 5], // D
      [1, 2, 5, 6], // E
      [1, 6], // F
    ];
    const r = dancingLinksAlgorithmX({ columnCount: 7, rows });
    expect(r).not.toBeNull();
    expect(isExactCover(r!.rows, rows, 7)).toBe(true);
  });

  it('infeasible problem returns null', () => {
    const rows = [[0, 1], [1, 2]];
    const r = dancingLinksAlgorithmX({ columnCount: 3, rows });
    expect(r).toBeNull();
  });

  it('row with one column', () => {
    const r = dancingLinksAlgorithmX({ columnCount: 1, rows: [[0]] });
    expect(r).toEqual({ rows: [0] });
  });

  it('two rows, choose one', () => {
    const rows = [[0, 1, 2], [0, 1, 2]];
    const r = dancingLinksAlgorithmX({ columnCount: 3, rows });
    expect(r).not.toBeNull();
    expect(r!.rows).toHaveLength(1);
  });

  it('skips empty rows safely', () => {
    const r = dancingLinksAlgorithmX({ columnCount: 2, rows: [[], [0, 1]] });
    expect(r).toEqual({ rows: [1] });
  });

  it('produces sorted row indices', () => {
    const rows = [[2, 3], [0, 1]];
    const r = dancingLinksAlgorithmX({ columnCount: 4, rows });
    expect(r).toEqual({ rows: [0, 1] });
  });

  it('larger structured problem', () => {
    // Partition 6 columns by pairs (0,1)(2,3)(4,5)
    const rows = [
      [0, 1], [2, 3], [4, 5],
      [0, 2], [1, 3],
    ];
    const r = dancingLinksAlgorithmX({ columnCount: 6, rows });
    expect(r).not.toBeNull();
    expect(isExactCover(r!.rows, rows, 6)).toBe(true);
  });
});
