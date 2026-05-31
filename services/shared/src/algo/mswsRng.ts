// Middle-Square Weyl Sequence PRNG (Widynski).
// State = 64-bit x, weyl counter w, fixed odd increment s. Each step squares
// x, adds w, then returns the swapped high/low halves. Passes BigCrush despite
// its simplicity, but should not be used for cryptography.

const MASK64 = (1n << 64n) - 1n;
const MASK32 = (1n << 32n) - 1n;
const DEFAULT_S = 0xb5ad4eceda1ce2a9n;

export class MswsRng {
  private x: bigint;
  private w: bigint;
  private s: bigint;

  constructor(seed: bigint | number = 0n, increment: bigint = DEFAULT_S) {
    this.s = increment | 1n;
    this.x = 0n;
    this.w = 0n;
    this.seed(seed);
  }

  seed(seed: bigint | number): void {
    let raw = typeof seed === 'bigint' ? seed : BigInt(seed);
    raw = raw & MASK64;
    this.x = raw;
    this.w = raw;
  }

  nextUint32(): number {
    this.x = (this.x * this.x) & MASK64;
    this.w = (this.w + this.s) & MASK64;
    this.x = (this.x + this.w) & MASK64;
    const swapped = (((this.x >> 32n) | (this.x << 32n)) & MASK64);
    this.x = swapped;
    return Number(swapped & MASK32);
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }
}

export function mswsRng(seed: bigint | number = 0n, increment: bigint = DEFAULT_S): MswsRng {
  return new MswsRng(seed, increment);
}
