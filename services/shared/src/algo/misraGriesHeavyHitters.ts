// Misra-Gries heavy-hitters: streaming O(k) summary that finds items with
// frequency > n/(k+1). Counts are conservative lower bounds.

export class MisraGriesHeavyHitters<T> {
  private readonly k: number;
  private readonly counters = new Map<T, number>();
  private total = 0;

  constructor(k: number) {
    if (!Number.isInteger(k) || k <= 0) throw new RangeError('k must be a positive integer');
    this.k = k;
  }

  add(item: T): void {
    this.total += 1;
    const cur = this.counters.get(item);
    if (cur !== undefined) {
      this.counters.set(item, cur + 1);
      return;
    }
    if (this.counters.size < this.k) {
      this.counters.set(item, 1);
      return;
    }
    // decrement all and remove zeros
    for (const [key, v] of this.counters) {
      const nv = v - 1;
      if (nv <= 0) this.counters.delete(key);
      else this.counters.set(key, nv);
    }
  }

  count(item: T): number {
    return this.counters.get(item) ?? 0;
  }

  size(): number {
    return this.total;
  }

  candidates(): { item: T; count: number }[] {
    return Array.from(this.counters, ([item, count]) => ({ item, count })).sort(
      (a, b) => b.count - a.count,
    );
  }
}
