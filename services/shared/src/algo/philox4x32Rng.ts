// Philox4x32-10 counter-based RNG. Generates 4 uint32 outputs per round of
// counter advancement; rounds=10 is the standard.

const MASK32 = 0xffffffff;
const M0 = 0xd2511f53;
const M1 = 0xcd9e8d57;
const W0 = 0x9e3779b9;
const W1 = 0xbb67ae85;

function mulHiLo(a: number, b: number): [number, number] {
  // Math.imul handles low 32 bits as signed; we need unsigned 64-bit product.
  const ah = (a >>> 16) & 0xffff;
  const al = a & 0xffff;
  const bh = (b >>> 16) & 0xffff;
  const bl = b & 0xffff;
  const ll = al * bl;
  const lh = al * bh;
  const hl = ah * bl;
  const hh = ah * bh;
  const mid = (ll >>> 16) + (lh & 0xffff) + (hl & 0xffff);
  const lo = ((mid & 0xffff) << 16) | (ll & 0xffff);
  const hi = hh + (lh >>> 16) + (hl >>> 16) + (mid >>> 16);
  return [hi >>> 0, lo >>> 0];
}

function round(ctr: [number, number, number, number], key: [number, number]): [number, number, number, number] {
  const [hi0, lo0] = mulHiLo(M0, ctr[0]);
  const [hi1, lo1] = mulHiLo(M1, ctr[2]);
  return [
    (hi1 ^ key[0] ^ ctr[1]) >>> 0,
    lo1,
    (hi0 ^ key[1] ^ ctr[3]) >>> 0,
    lo0,
  ];
}

function bumpKey(key: [number, number]): [number, number] {
  return [((key[0] + W0) & MASK32) >>> 0, ((key[1] + W1) & MASK32) >>> 0];
}

export class Philox4x32 {
  private counter: [number, number, number, number] = [0, 0, 0, 0];
  private key: [number, number];
  private buf: number[] = [];

  constructor(seed: number | bigint = 0, key: [number, number] = [0x12345678, 0x9abcdef0]) {
    this.key = [key[0] >>> 0, key[1] >>> 0];
    this.seed(seed);
  }

  seed(seed: number | bigint): void {
    const s = typeof seed === 'bigint' ? Number(seed & 0xffffffffn) : seed >>> 0;
    this.counter = [s >>> 0, 0, 0, 0];
    this.buf = [];
  }

  private incrementCounter(): void {
    for (let i = 0; i < 4; i += 1) {
      this.counter[i] = (this.counter[i] + 1) >>> 0;
      if (this.counter[i] !== 0) return;
    }
  }

  private generate(): void {
    let ctr: [number, number, number, number] = [this.counter[0], this.counter[1], this.counter[2], this.counter[3]];
    let key: [number, number] = [this.key[0], this.key[1]];
    for (let r = 0; r < 10; r += 1) {
      ctr = round(ctr, key);
      key = bumpKey(key);
    }
    this.buf.push(ctr[0], ctr[1], ctr[2], ctr[3]);
    this.incrementCounter();
  }

  nextUint32(): number {
    if (this.buf.length === 0) this.generate();
    return this.buf.shift()! >>> 0;
  }

  nextFloat(): number {
    // top 24 bits to keep within float precision
    return (this.nextUint32() >>> 8) / 0x1000000;
  }
}

export function philox4x32Rng(seed: number | bigint = 0, key?: [number, number]): Philox4x32 {
  return new Philox4x32(seed, key);
}
