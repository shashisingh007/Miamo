// PCG64 (DXSM variant). 128-bit LCG state with double-xorshift-multiplier
// output. Provides 64-bit uniform output with very long period.

const MASK64 = (1n << 64n) - 1n;
const MASK128 = (1n << 128n) - 1n;
const MULT = 0x2360ed051fc65da44385df649fccf645n;
const DEFAULT_INC = 0x5851f42d4c957f2d14057b7ef767814fn;

export class Pcg64 {
  private state: bigint;
  private inc: bigint;

  constructor(seed: bigint | number = 0n, inc: bigint = DEFAULT_INC) {
    this.state = 0n;
    this.inc = (inc << 1n) | 1n;
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    const s = typeof seed === 'bigint' ? seed : BigInt(seed);
    this.state = 0n;
    this.step();
    this.state = (this.state + (s & MASK128)) & MASK128;
    this.step();
  }

  private step(): void {
    this.state = ((this.state * MULT) + this.inc) & MASK128;
  }

  nextUint64(): bigint {
    const oldState = this.state;
    this.step();
    // DXSM output
    const hi = (oldState >> 64n) & MASK64;
    const lo = oldState & MASK64;
    let x = hi ^ (hi >> 32n);
    x = (x * 0xda942042e4dd58b5n) & MASK64;
    x = x ^ (x >> 48n);
    x = (x * (lo | 1n)) & MASK64;
    return x;
  }

  nextFloat(): number {
    const top = this.nextUint64() >> 11n;
    return Number(top) / 2 ** 53;
  }
}

export function pcg64Rng(seed: bigint | number = 0n, inc: bigint = DEFAULT_INC): Pcg64 {
  return new Pcg64(seed, inc);
}
