// PCG32 (XSH-RR variant) — 32-bit output, 64-bit state.
// state' = state * 6364136223846793005 + increment  (mod 2^64)
// output = rotr32(((state >> 18) ^ state) >> 27, state >> 59)

const MASK32 = 0xffffffff;
const MASK64 = (1n << 64n) - 1n;
const MULTIPLIER = 6364136223846793005n;
const DEFAULT_INC = 1442695040888963407n;

export class Pcg32 {
  private state: bigint = 0n;
  private inc: bigint = DEFAULT_INC | 1n;

  constructor(seed: number | bigint = 0n, stream: number | bigint = 0n) {
    this.seed(seed, stream);
  }

  seed(seed: number | bigint, stream: number | bigint = 0n): void {
    const s = typeof seed === 'bigint' ? seed : BigInt(seed >>> 0);
    const str = typeof stream === 'bigint' ? stream : BigInt(stream >>> 0);
    this.inc = ((str << 1n) | 1n) & MASK64;
    this.state = 0n;
    this.nextUint32();
    this.state = (this.state + s) & MASK64;
    this.nextUint32();
  }

  nextUint32(): number {
    const oldState = this.state;
    this.state = (oldState * MULTIPLIER + this.inc) & MASK64;
    const xorShifted = Number(((oldState >> 18n) ^ oldState) >> 27n) & MASK32;
    const rot = Number(oldState >> 59n) & 31;
    return (((xorShifted >>> rot) | (xorShifted << ((-rot) & 31))) >>> 0);
  }

  nextFloat(): number {
    return (this.nextUint32() >>> 8) / 0x1000000;
  }
}

export function pcg32Rng(seed: number | bigint = 0n, stream: number | bigint = 0n): Pcg32 {
  return new Pcg32(seed, stream);
}
