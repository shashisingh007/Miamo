// Kahan-Babuška-Neumaier compensated summation for float arrays.

export function kahanFloatSum(values: ReadonlyArray<number>): number {
  if (!Array.isArray(values)) throw new TypeError('values must be an array');
  let sum = 0;
  let c = 0; // compensation
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (typeof v !== 'number') throw new TypeError('values must contain numbers');
    if (!Number.isFinite(v)) return v + 0; // NaN/Inf propagates
    const t = sum + v;
    if (Math.abs(sum) >= Math.abs(v)) c += sum - t + v;
    else c += v - t + sum;
    sum = t;
  }
  return sum + c;
}

export class KahanAccumulator {
  private sum = 0;
  private c = 0;
  private _count = 0;

  add(v: number): this {
    if (typeof v !== 'number') throw new TypeError('value must be a number');
    if (!Number.isFinite(v)) {
      this.sum += v;
      this._count++;
      return this;
    }
    const t = this.sum + v;
    if (Math.abs(this.sum) >= Math.abs(v)) this.c += this.sum - t + v;
    else this.c += v - t + this.sum;
    this.sum = t;
    this._count++;
    return this;
  }

  get value(): number {
    return this.sum + this.c;
  }

  get count(): number {
    return this._count;
  }

  reset(): void {
    this.sum = 0;
    this.c = 0;
    this._count = 0;
  }
}
