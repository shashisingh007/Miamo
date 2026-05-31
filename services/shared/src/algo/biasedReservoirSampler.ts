// Biased reservoir sampler — Aggarwal's exponential forward-decay biased reservoir.
// Each new item is admitted with probability k/n (n = items seen so far); on
// admission, it replaces a uniformly chosen current slot. The fade parameter f ∈ (0,1]
// multiplies the per-item retention before each admit, so older items decay faster.
// When fade=1 this reduces to classic reservoir sampling.

export interface BiasedReservoirOptions {
  rng?: () => number;
  fade?: number;
}

export class BiasedReservoirSampler<T> {
  private readonly capacity: number;
  private readonly rng: () => number;
  private readonly fade: number;
  private buf: T[] = [];
  private seen = 0;

  constructor(capacity: number, options: BiasedReservoirOptions = {}) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new RangeError('capacity must be a positive integer');
    }
    const fade = options.fade ?? 1;
    if (!Number.isFinite(fade) || fade <= 0 || fade > 1) {
      throw new RangeError('fade must be in (0,1]');
    }
    this.capacity = capacity;
    this.rng = options.rng ?? Math.random;
    this.fade = fade;
  }

  add(item: T): void {
    this.seen += 1;
    if (this.buf.length < this.capacity) {
      this.buf.push(item);
      return;
    }
    // probability of admit = (k / n) * fade^? — apply fade per add by pre-shrinking
    // the effective n. The simplest: prob = (capacity / seen). Then independently,
    // before admission, age each slot with probability (1 - fade) → eviction.
    if (this.fade < 1) {
      for (let i = this.buf.length - 1; i >= 0; i -= 1) {
        if (this.rng() > this.fade) {
          this.buf.splice(i, 1);
        }
      }
    }
    if (this.buf.length < this.capacity) {
      this.buf.push(item);
      return;
    }
    const p = this.capacity / this.seen;
    if (this.rng() < p) {
      const idx = Math.floor(this.rng() * this.buf.length);
      this.buf[idx] = item;
    }
  }

  sample(): T[] {
    return this.buf.slice();
  }

  size(): number {
    return this.buf.length;
  }

  total(): number {
    return this.seen;
  }
}
