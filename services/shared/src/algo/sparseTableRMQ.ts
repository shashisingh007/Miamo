export class SparseTableRMQ {
  private readonly arr: number[];
  private readonly logTable: number[];
  private readonly table: number[][];

  constructor(values: number[]) {
    this.arr = values.slice();
    const n = values.length;
    this.logTable = new Array<number>(n + 1).fill(0);
    for (let i = 2; i <= n; i++) this.logTable[i] = this.logTable[Math.floor(i / 2)] + 1;
    const k = n === 0 ? 0 : this.logTable[n] + 1;
    this.table = [];
    for (let i = 0; i < k; i++) this.table.push(new Array<number>(n).fill(0));
    for (let i = 0; i < n; i++) this.table[0][i] = values[i];
    for (let j = 1; j < k; j++) {
      const len = 1 << j;
      for (let i = 0; i + len <= n; i++) {
        this.table[j][i] = Math.min(this.table[j - 1][i], this.table[j - 1][i + (len >> 1)]);
      }
    }
  }

  rangeMin(l: number, r: number): number {
    if (l < 0 || r >= this.arr.length || l > r) {
      throw new RangeError('invalid range');
    }
    const length = r - l + 1;
    const k = this.logTable[length];
    return Math.min(this.table[k][l], this.table[k][r - (1 << k) + 1]);
  }

  size(): number {
    return this.arr.length;
  }
}
