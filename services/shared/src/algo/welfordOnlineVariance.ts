// Welford's online algorithm for mean and variance.

export class WelfordOnlineVariance {
  private n = 0;
  private mean = 0;
  private m2 = 0;

  add(v: number): this {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new TypeError('value must be a finite number');
    }
    this.n++;
    const delta = v - this.mean;
    this.mean += delta / this.n;
    const delta2 = v - this.mean;
    this.m2 += delta * delta2;
    return this;
  }

  get count(): number {
    return this.n;
  }

  get average(): number {
    return this.n === 0 ? 0 : this.mean;
  }

  get variancePopulation(): number {
    return this.n === 0 ? 0 : this.m2 / this.n;
  }

  get varianceSample(): number {
    return this.n < 2 ? 0 : this.m2 / (this.n - 1);
  }

  get stdDevPopulation(): number {
    return Math.sqrt(this.variancePopulation);
  }

  get stdDevSample(): number {
    return Math.sqrt(this.varianceSample);
  }

  reset(): void {
    this.n = 0;
    this.mean = 0;
    this.m2 = 0;
  }

  merge(other: WelfordOnlineVariance): this {
    if (other.n === 0) return this;
    if (this.n === 0) {
      this.n = other.n;
      this.mean = other.mean;
      this.m2 = other.m2;
      return this;
    }
    const total = this.n + other.n;
    const delta = other.mean - this.mean;
    const newMean = (this.n * this.mean + other.n * other.mean) / total;
    const newM2 = this.m2 + other.m2 + (delta * delta * this.n * other.n) / total;
    this.n = total;
    this.mean = newMean;
    this.m2 = newM2;
    return this;
  }
}
