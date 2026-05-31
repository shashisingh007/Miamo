function rotl(x: bigint, k: bigint): bigint {
  const MASK = (1n << 64n) - 1n;
  return (((x << k) & MASK) | (x >> (64n - k))) & MASK;
}

const MASK64 = (1n << 64n) - 1n;

export class Xoshiro256 {
  private s: [bigint, bigint, bigint, bigint] = [1n, 1n, 1n, 1n];

  constructor(seed: bigint | number = 0x9e3779b97f4a7c15n) {
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    let z = (typeof seed === 'bigint' ? seed : BigInt(seed)) & MASK64;
    for (let i = 0; i < 4; i += 1) {
      z = (z + 0x9e3779b97f4a7c15n) & MASK64;
      let r = (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n & MASK64;
      r = (r ^ (r >> 27n)) * 0x94d049bb133111ebn & MASK64;
      r = r ^ (r >> 31n);
      this.s[i] = r & MASK64;
    }
    if (this.s[0] === 0n && this.s[1] === 0n && this.s[2] === 0n && this.s[3] === 0n) {
      this.s[0] = 1n;
    }
  }

  nextUint64(): bigint {
    const result = (rotl((this.s[1] * 5n) & MASK64, 7n) * 9n) & MASK64;
    const t = (this.s[1] << 17n) & MASK64;
    this.s[2] ^= this.s[0];
    this.s[3] ^= this.s[1];
    this.s[1] ^= this.s[2];
    this.s[0] ^= this.s[3];
    this.s[2] ^= t;
    this.s[3] = rotl(this.s[3], 45n);
    return result;
  }

  nextFloat(): number {
    // top 53 bits
    const v = this.nextUint64() >> 11n;
    return Number(v) / Number(1n << 53n);
  }
}

export function xoshiro256(seed?: bigint | number): Xoshiro256 {
  return new Xoshiro256(seed);
}
