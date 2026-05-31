// Lehmer 64-bit LCG: state*multiplier mod 2^128 then take high 64 bits.
// Uses BigInt for the 128-bit multiply; state is 128-bit so we can keep
// full precision across the next() updates without losing entropy.

const MASK64 = (1n << 64n) - 1n;
const MASK128 = (1n << 128n) - 1n;
const MULTIPLIER = 0xda942042e4dd58b5n;

export class Lehmer64 {
  private state: bigint;

  constructor(seed: bigint | number = 1n) {
    let s = typeof seed === 'number' ? BigInt(seed) : seed;
    s = s & MASK128;
    if (s === 0n) s = 1n;
    this.state = s;
  }

  seed(seed: bigint | number): void {
    let s = typeof seed === 'number' ? BigInt(seed) : seed;
    s = s & MASK128;
    if (s === 0n) s = 1n;
    this.state = s;
  }

  nextUint64(): bigint {
    this.state = (this.state * MULTIPLIER) & MASK128;
    return (this.state >> 64n) & MASK64;
  }

  nextFloat(): number {
    // top 53 bits of nextUint64 mapped to [0, 1)
    const top = this.nextUint64() >> 11n;
    return Number(top) / 2 ** 53;
  }
}

export function lehmer64Rng(seed: bigint | number = 1n): Lehmer64 {
  return new Lehmer64(seed);
}
