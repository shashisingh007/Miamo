/**
 * P^2 algorithm for online quantile estimation (Jain & Chlamtac, 1985).
 * Estimates a single p-quantile from a stream using O(1) memory and update.
 */
export class P2QuantileEstimator {
  private p: number;
  private n: number[] = [1, 2, 3, 4, 5]; // marker positions (1-indexed)
  private np: number[] = [];
  private dn: number[] = [];
  private q: number[] = [];
  private count = 0;

  constructor(p: number) {
    if (!Number.isFinite(p) || p <= 0 || p >= 1) {
      throw new Error('P2QuantileEstimator: p must be in (0, 1)');
    }
    this.p = p;
    this.np = [1, 1 + 2 * p, 1 + 4 * p, 3 + 2 * p, 5];
    this.dn = [0, p / 2, p, (1 + p) / 2, 1];
  }

  add(x: number): void {
    if (!Number.isFinite(x)) throw new Error('P2QuantileEstimator: non-finite');
    if (this.count < 5) {
      this.q.push(x);
      this.count++;
      if (this.count === 5) this.q.sort((a, b) => a - b);
      return;
    }

    let k: number;
    if (x < this.q[0]) {
      this.q[0] = x;
      k = 0;
    } else if (x < this.q[1]) k = 0;
    else if (x < this.q[2]) k = 1;
    else if (x < this.q[3]) k = 2;
    else if (x <= this.q[4]) k = 3;
    else {
      this.q[4] = x;
      k = 3;
    }

    for (let i = k + 1; i < 5; i++) this.n[i]++;
    for (let i = 0; i < 5; i++) this.np[i] += this.dn[i];
    this.count++;

    for (let i = 1; i <= 3; i++) {
      const d = this.np[i] - this.n[i];
      if (
        (d >= 1 && this.n[i + 1] - this.n[i] > 1) ||
        (d <= -1 && this.n[i - 1] - this.n[i] < -1)
      ) {
        const sign = d >= 0 ? 1 : -1;
        const qParabolic = this.parabolic(i, sign);
        if (this.q[i - 1] < qParabolic && qParabolic < this.q[i + 1]) {
          this.q[i] = qParabolic;
        } else {
          this.q[i] = this.linear(i, sign);
        }
        this.n[i] += sign;
      }
    }
  }

  private parabolic(i: number, d: number): number {
    return (
      this.q[i] +
      (d / (this.n[i + 1] - this.n[i - 1])) *
        ((this.n[i] - this.n[i - 1] + d) * (this.q[i + 1] - this.q[i]) /
          (this.n[i + 1] - this.n[i]) +
          (this.n[i + 1] - this.n[i] - d) * (this.q[i] - this.q[i - 1]) /
            (this.n[i] - this.n[i - 1]))
    );
  }

  private linear(i: number, d: number): number {
    return this.q[i] + d * (this.q[i + d] - this.q[i]) / (this.n[i + d] - this.n[i]);
  }

  quantile(): number {
    if (this.count === 0) throw new Error('P2QuantileEstimator: empty');
    if (this.count < 5) {
      const sorted = this.q.slice().sort((a, b) => a - b);
      const idx = Math.min(sorted.length - 1, Math.floor(this.p * sorted.length));
      return sorted[idx];
    }
    return this.q[2];
  }

  total(): number {
    return this.count;
  }
}
