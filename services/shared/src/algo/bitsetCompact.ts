// Compact bitset over Uint32Array.

export class BitsetCompact {
  readonly size: number;
  private readonly words: Uint32Array;

  constructor(size: number) {
    if (!Number.isInteger(size) || size < 0) {
      throw new Error('size must be a non-negative integer');
    }
    this.size = size;
    this.words = new Uint32Array(Math.ceil(size / 32));
  }

  private check(i: number): void {
    if (!Number.isInteger(i) || i < 0 || i >= this.size) {
      throw new RangeError('index out of range');
    }
  }

  set(i: number): this {
    this.check(i);
    this.words[i >>> 5] |= 1 << (i & 31);
    return this;
  }

  clear(i: number): this {
    this.check(i);
    this.words[i >>> 5] &= ~(1 << (i & 31));
    return this;
  }

  toggle(i: number): this {
    this.check(i);
    this.words[i >>> 5] ^= 1 << (i & 31);
    return this;
  }

  get(i: number): boolean {
    this.check(i);
    return ((this.words[i >>> 5] >>> (i & 31)) & 1) === 1;
  }

  popcount(): number {
    let count = 0;
    for (let i = 0; i < this.words.length; i++) count += popcnt32(this.words[i]);
    return count;
  }

  setAll(): void {
    this.words.fill(0xffffffff);
    const extra = this.words.length * 32 - this.size;
    if (extra > 0) {
      this.words[this.words.length - 1] &= (0xffffffff >>> extra);
    }
  }

  clearAll(): void {
    this.words.fill(0);
  }

  and(other: BitsetCompact): BitsetCompact {
    if (other.size !== this.size) throw new Error('size mismatch');
    const out = new BitsetCompact(this.size);
    for (let i = 0; i < this.words.length; i++) out.words[i] = this.words[i] & other.words[i];
    return out;
  }

  or(other: BitsetCompact): BitsetCompact {
    if (other.size !== this.size) throw new Error('size mismatch');
    const out = new BitsetCompact(this.size);
    for (let i = 0; i < this.words.length; i++) out.words[i] = this.words[i] | other.words[i];
    return out;
  }

  xor(other: BitsetCompact): BitsetCompact {
    if (other.size !== this.size) throw new Error('size mismatch');
    const out = new BitsetCompact(this.size);
    for (let i = 0; i < this.words.length; i++) out.words[i] = this.words[i] ^ other.words[i];
    return out;
  }

  toIndexArray(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.size; i++) if (this.get(i)) out.push(i);
    return out;
  }
}

function popcnt32(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return ((((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24);
}
