// Xorshift1024* (Marsaglia, refined by Vigna). 1024-bit state over sixteen
// 64-bit words. Output is state[p] * 1181783497276652981 mod 2^64.
// Provides high-quality random output for non-crypto uses.

const MASK64 = (1n << 64n) - 1n;
const MULT = 1181783497276652981n;

function rotl(x: bigint, k: bigint): bigint {
  return ((x << k) | (x >> (64n - k))) & MASK64;
}

export class Xorshift1024Star {
  private state: BigUint64Array;
  private p = 0;

  constructor(seed: bigint | number = 1n) {
    this.state = new BigUint64Array(16);
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    let s = typeof seed === 'bigint' ? seed : BigInt(seed);
    s = s & MASK64;
    if (s === 0n) s = 1n;
    // splitmix64 to fill 16 words
    for (let i = 0; i < 16; i += 1) {
      s = (s + 0x9e3779b97f4a7c15n) & MASK64;
      let z = s;
      z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
      z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
      z = z ^ (z >> 31n);
      this.state[i] = z & MASK64;
    }
    this.p = 0;
  }

  nextUint64(): bigint {
    const s0 = this.state[this.p];
    this.p = (this.p + 1) & 15;
    let s1 = this.state[this.p];
    s1 = s1 ^ ((s1 << 31n) & MASK64);
    s1 = s1 ^ (s1 >> 11n);
    s1 = s1 ^ s0 ^ (s0 >> 30n);
    this.state[this.p] = s1 & MASK64;
    return (this.state[this.p] * MULT) & MASK64;
  }

  nextFloat(): number {
    const top = this.nextUint64() >> 11n;
    return Number(top) / 2 ** 53;
  }
}

export function xorshift1024StarRng(seed: bigint | number = 1n): Xorshift1024Star {
  return new Xorshift1024Star(seed);
}

// suppress unused warning for rotl helper kept for parity with reference
void rotl;
