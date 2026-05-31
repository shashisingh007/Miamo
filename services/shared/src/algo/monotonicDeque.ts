export class MonotonicDeque<T> {
  private items: { value: T; key: number }[] = [];
  private readonly mode: 'max' | 'min';

  constructor(mode: 'max' | 'min' = 'max') {
    this.mode = mode;
  }

  push(value: T, key: number): void {
    if (!Number.isFinite(key)) throw new TypeError('key must be a finite number');
    if (this.mode === 'max') {
      while (this.items.length > 0 && this.items[this.items.length - 1].key <= key) {
        this.items.pop();
      }
    } else {
      while (this.items.length > 0 && this.items[this.items.length - 1].key >= key) {
        this.items.pop();
      }
    }
    this.items.push({ value, key });
  }

  popFrontIf(predicate: (value: T, key: number) => boolean): void {
    while (this.items.length > 0 && predicate(this.items[0].value, this.items[0].key)) {
      this.items.shift();
    }
  }

  front(): { value: T; key: number } | undefined {
    return this.items[0];
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

export function slidingWindowMaximum(values: number[], windowSize: number): number[] {
  if (!Number.isInteger(windowSize) || windowSize <= 0) {
    throw new RangeError('windowSize must be a positive integer');
  }
  // value = index, key = values[index] (for monotonic max ordering)
  const dq = new MonotonicDeque<number>('max');
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    dq.push(i, values[i]);
    dq.popFrontIf((idx) => idx <= i - windowSize);
    if (i >= windowSize - 1) out.push(values[dq.front()!.value]);
  }
  return out;
}
