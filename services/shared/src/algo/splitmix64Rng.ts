const MASK64 = (1n << 64n) - 1n;

export class Splitmix64 {
  private state: bigint = 0n;

  constructor(seed: bigint | number = 0n) {
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    this.state = (typeof seed === 'bigint' ? seed : BigInt(seed)) & MASK64;
  }

  nextUint64(): bigint {
    this.state = (this.state + 0x9e3779b97f4a7c15n) & MASK64;
    let z = this.state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
    return (z ^ (z >> 31n)) & MASK64;
  }

  nextFloat(): number {
    const v = this.nextUint64() >> 11n;
    return Number(v) / Number(1n << 53n);
  }
}

export function splitmix64Rng(seed?: bigint | number): Splitmix64 {
  return new Splitmix64(seed);
}
