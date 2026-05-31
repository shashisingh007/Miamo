export class FenwickTree2D {
  private readonly rows: number;
  private readonly cols: number;
  private readonly tree: number[][];

  constructor(rows: number, cols: number) {
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows <= 0 || cols <= 0) {
      throw new RangeError('rows and cols must be positive integers');
    }
    this.rows = rows;
    this.cols = cols;
    this.tree = [];
    for (let i = 0; i <= rows; i++) this.tree.push(new Array<number>(cols + 1).fill(0));
  }

  update(row: number, col: number, delta: number): void {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      throw new RangeError('out of bounds');
    }
    for (let i = row + 1; i <= this.rows; i += i & -i) {
      for (let j = col + 1; j <= this.cols; j += j & -j) {
        this.tree[i][j] += delta;
      }
    }
  }

  prefixSum(row: number, col: number): number {
    if (row < -1 || row >= this.rows || col < -1 || col >= this.cols) {
      throw new RangeError('out of bounds');
    }
    if (row < 0 || col < 0) return 0;
    let sum = 0;
    for (let i = row + 1; i > 0; i -= i & -i) {
      for (let j = col + 1; j > 0; j -= j & -j) {
        sum += this.tree[i][j];
      }
    }
    return sum;
  }

  rangeSum(r1: number, c1: number, r2: number, c2: number): number {
    if (r1 > r2 || c1 > c2) return 0;
    return (
      this.prefixSum(r2, c2) -
      this.prefixSum(r1 - 1, c2) -
      this.prefixSum(r2, c1 - 1) +
      this.prefixSum(r1 - 1, c1 - 1)
    );
  }
}
