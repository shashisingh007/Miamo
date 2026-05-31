const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export class MersenneTwister {
  private mt: Uint32Array = new Uint32Array(N);
  private index: number = N + 1;

  constructor(seed: number = 5489) {
    this.seed(seed);
  }

  seed(seed: number): void {
    if (!Number.isFinite(seed)) {
      throw new Error('MersenneTwister: seed must be finite');
    }
    const s = seed >>> 0;
    this.mt[0] = s;
    for (let i = 1; i < N; i += 1) {
      const prev = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
      // 1812433253 * prev + i, performed with 32-bit unsigned math
      this.mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.index = N;
  }

  private generate(): void {
    for (let i = 0; i < N; i += 1) {
      const y = (this.mt[i] & UPPER_MASK) | (this.mt[(i + 1) % N] & LOWER_MASK);
      let next = this.mt[(i + M) % N] ^ (y >>> 1);
      if (y & 1) next ^= MATRIX_A;
      this.mt[i] = next >>> 0;
    }
    this.index = 0;
  }

  nextUint32(): number {
    if (this.index >= N) this.generate();
    let y = this.mt[this.index];
    this.index += 1;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x100000000;
  }
}

export function mersenneTwister(seed?: number): MersenneTwister {
  return new MersenneTwister(seed);
}
