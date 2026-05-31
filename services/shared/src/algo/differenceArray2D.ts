// 2D difference array for batched rectangle increments, then point queries via prefix sum.

export class DifferenceArray2D {
  private readonly rows: number;
  private readonly cols: number;
  private readonly diff: number[][];
  private sealed = false;
  private prefix: number[][] | null = null;

  constructor(rows: number, cols: number) {
    if (!Number.isInteger(rows) || rows <= 0 || !Number.isInteger(cols) || cols <= 0) {
      throw new RangeError('rows and cols must be positive integers');
    }
    this.rows = rows;
    this.cols = cols;
    this.diff = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  }

  addRect(r1: number, c1: number, r2: number, c2: number, delta: number): void {
    if (this.sealed) throw new Error('cannot add after seal()');
    if (!Number.isFinite(delta)) throw new TypeError('delta must be finite');
    if (
      !Number.isInteger(r1) ||
      !Number.isInteger(c1) ||
      !Number.isInteger(r2) ||
      !Number.isInteger(c2)
    ) {
      throw new RangeError('rect coords must be integers');
    }
    if (r1 < 0 || c1 < 0 || r2 >= this.rows || c2 >= this.cols || r1 > r2 || c1 > c2) {
      throw new RangeError('rect out of bounds');
    }
    this.diff[r1][c1] += delta;
    this.diff[r2 + 1][c1] -= delta;
    this.diff[r1][c2 + 1] -= delta;
    this.diff[r2 + 1][c2 + 1] += delta;
  }

  seal(): void {
    if (this.sealed) return;
    const out: number[][] = Array.from({ length: this.rows }, () => new Array(this.cols).fill(0));
    for (let i = 0; i < this.rows; i += 1) {
      let rowAcc = 0;
      for (let j = 0; j < this.cols; j += 1) {
        rowAcc += this.diff[i][j];
        const above = i > 0 ? out[i - 1][j] : 0;
        out[i][j] = above + rowAcc;
      }
    }
    this.prefix = out;
    this.sealed = true;
  }

  get(r: number, c: number): number {
    if (!this.sealed) this.seal();
    if (
      !Number.isInteger(r) ||
      !Number.isInteger(c) ||
      r < 0 ||
      c < 0 ||
      r >= this.rows ||
      c >= this.cols
    ) {
      throw new RangeError('idx out of bounds');
    }
    return this.prefix![r][c];
  }
}
