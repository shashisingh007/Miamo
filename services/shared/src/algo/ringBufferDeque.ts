// Circular-buffer Deque (double-ended queue) with O(1) push/pop on both ends.
// Auto-grows by doubling when full.

export class RingBufferDeque<T> {
  private buf: Array<T | undefined>;
  private head = 0; // index of front element
  private count = 0;

  constructor(initialCapacity = 16) {
    if (!Number.isInteger(initialCapacity) || initialCapacity < 1) {
      throw new Error('initialCapacity must be a positive integer');
    }
    this.buf = new Array(initialCapacity);
  }

  get size(): number {
    return this.count;
  }

  get capacity(): number {
    return this.buf.length;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  clear(): void {
    this.head = 0;
    this.count = 0;
    for (let i = 0; i < this.buf.length; i++) this.buf[i] = undefined;
  }

  private grow(): void {
    const cap = this.buf.length;
    const next = new Array<T | undefined>(cap * 2);
    for (let i = 0; i < this.count; i++) next[i] = this.buf[(this.head + i) % cap];
    this.buf = next;
    this.head = 0;
  }

  pushBack(value: T): void {
    if (this.count === this.buf.length) this.grow();
    const idx = (this.head + this.count) % this.buf.length;
    this.buf[idx] = value;
    this.count++;
  }

  pushFront(value: T): void {
    if (this.count === this.buf.length) this.grow();
    this.head = (this.head - 1 + this.buf.length) % this.buf.length;
    this.buf[this.head] = value;
    this.count++;
  }

  popBack(): T | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.head + this.count - 1) % this.buf.length;
    const v = this.buf[idx] as T;
    this.buf[idx] = undefined;
    this.count--;
    return v;
  }

  popFront(): T | undefined {
    if (this.count === 0) return undefined;
    const v = this.buf[this.head] as T;
    this.buf[this.head] = undefined;
    this.head = (this.head + 1) % this.buf.length;
    this.count--;
    return v;
  }

  peekFront(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buf[this.head] as T;
  }

  peekBack(): T | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.head + this.count - 1) % this.buf.length;
    return this.buf[idx] as T;
  }

  at(i: number): T | undefined {
    if (!Number.isInteger(i)) throw new TypeError('index must be an integer');
    if (i < 0 || i >= this.count) return undefined;
    return this.buf[(this.head + i) % this.buf.length] as T;
  }

  toArray(): T[] {
    const out: T[] = new Array(this.count);
    for (let i = 0; i < this.count; i++) out[i] = this.buf[(this.head + i) % this.buf.length] as T;
    return out;
  }
}
