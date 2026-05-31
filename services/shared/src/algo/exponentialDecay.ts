export class ExponentialDecay {
  private value = 0;
  private weight = 0;
  private readonly halfLife: number;
  private lastT: number | null = null;
  private readonly lambda: number;

  constructor(halfLife: number) {
    if (!Number.isFinite(halfLife) || halfLife <= 0) {
      throw new Error('halfLife must be positive finite');
    }
    this.halfLife = halfLife;
    this.lambda = Math.LN2 / halfLife;
  }

  add(x: number, t: number): void {
    if (!Number.isFinite(x)) throw new Error('value must be finite');
    if (!Number.isFinite(t)) throw new Error('time must be finite');
    if (this.lastT !== null && t < this.lastT) {
      throw new Error('time must be monotonically non-decreasing');
    }
    if (this.lastT !== null) {
      const decay = Math.exp(-this.lambda * (t - this.lastT));
      this.value *= decay;
      this.weight *= decay;
    }
    this.value += x;
    this.weight += 1;
    this.lastT = t;
  }

  mean(): number {
    if (this.weight === 0) throw new Error('empty decay');
    return this.value / this.weight;
  }

  total(): number {
    return this.weight;
  }

  sum(): number {
    return this.value;
  }

  getHalfLife(): number {
    return this.halfLife;
  }
}
