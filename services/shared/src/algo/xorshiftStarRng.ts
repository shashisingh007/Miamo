// Xorshift* (Marsaglia 2003). Single 64-bit state, output multiplied by a
// fixed odd constant. Lightweight non-cryptographic PRNG.

const MASK64 = (1n << 64n) - 1n;
const MULT = 0x2545f4914f6cdd1dn;

export class XorshiftStar {
  private state: bigint;

  constructor(seed: bigint | number = 1n) {
    this.state = 1n;
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    let s = typeof seed === 'bigint' ? seed : BigInt(seed);
    s = s & MASK64;
    if (s === 0n) s = 1n;
    this.state = s;
  }

  nextUint64(): bigint {
    let x = this.state;
    x ^= (x >> 12n);
    x ^= (x << 25n) & MASK64;
    x ^= (x >> 27n);
    this.state = x;
    return (x * MULT) & MASK64;
  }

  nextFloat(): number {
    const top = this.nextUint64() >> 11n;
    return Number(top) / 2 ** 53;
  }
}

export function xorshiftStarRng(seed: bigint | number = 1n): XorshiftStar {
  return new XorshiftStar(seed);
}
