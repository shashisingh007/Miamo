// 2D Fenwick (BIT) supporting point update of maximum and prefix-rectangle max query.
// Coordinates are 1-indexed in [1..rows] x [1..cols]. Initial value is -Infinity.

export class Fenwick2DMax {
  private rows: number;
  private cols: number;
  private tree: number[][];

  constructor(rows: number, cols: number) {
    if (!Number.isInteger(rows) || rows <= 0) throw new Error('rows must be a positive integer');
    if (!Number.isInteger(cols) || cols <= 0) throw new Error('cols must be a positive integer');
    this.rows = rows;
    this.cols = cols;
    this.tree = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(-Infinity));
  }

  update(r: number, c: number, v: number): void {
    if (!Number.isInteger(r) || r < 1 || r > this.rows) throw new Error('row out of range');
    if (!Number.isInteger(c) || c < 1 || c > this.cols) throw new Error('col out of range');
    if (!Number.isFinite(v)) throw new Error('non-finite value');
    for (let i = r; i <= this.rows; i += i & -i)
      for (let j = c; j <= this.cols; j += j & -j)
        if (v > this.tree[i][j]) this.tree[i][j] = v;
  }

  queryPrefixMax(r: number, c: number): number {
    if (!Number.isInteger(r) || r < 1 || r > this.rows) throw new Error('row out of range');
    if (!Number.isInteger(c) || c < 1 || c > this.cols) throw new Error('col out of range');
    let best = -Infinity;
    for (let i = r; i > 0; i -= i & -i)
      for (let j = c; j > 0; j -= j & -j)
        if (this.tree[i][j] > best) best = this.tree[i][j];
    return best;
  }
}
