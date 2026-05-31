/**
 * Space-Saving heavy hitters (Metwally et al. 2005).
 * Tracks the approximate top-k frequent items in a stream using k counters.
 *
 * Guarantees that any item with true frequency > N/k will be tracked.
 * Returned counts are upper bounds on true frequencies.
 */
export class SpaceSavingHeavyHitters<T> {
  private counters = new Map<T, number>();
  private k: number;
  private n = 0;

  constructor(k: number) {
    if (!Number.isInteger(k) || k < 1) throw new Error('SpaceSavingHeavyHitters: k must be positive integer');
    this.k = k;
  }

  add(item: T): void {
    this.n++;
    const cur = this.counters.get(item);
    if (cur !== undefined) {
      this.counters.set(item, cur + 1);
      return;
    }
    if (this.counters.size < this.k) {
      this.counters.set(item, 1);
      return;
    }
    // Replace minimum-count counter; new count = min + 1.
    let minKey: T | undefined;
    let minVal = Infinity;
    for (const [key, val] of this.counters) {
      if (val < minVal) {
        minVal = val;
        minKey = key;
      }
    }
    this.counters.delete(minKey as T);
    this.counters.set(item, minVal + 1);
  }

  total(): number {
    return this.n;
  }

  topK(): Array<{ item: T; count: number }> {
    const arr: Array<{ item: T; count: number }> = [];
    for (const [item, count] of this.counters) arr.push({ item, count });
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }
}

export function spaceSavingHeavyHitters<T>(
  stream: Iterable<T>,
  k: number
): Array<{ item: T; count: number }> {
  const ss = new SpaceSavingHeavyHitters<T>(k);
  for (const item of stream) ss.add(item);
  return ss.topK();
}
