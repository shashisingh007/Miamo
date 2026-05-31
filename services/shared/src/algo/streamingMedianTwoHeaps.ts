/**
 * Streaming median using two heaps (max-heap for lower half, min-heap for upper half).
 * Provides O(log n) add and O(1) median.
 */

class BinaryHeap {
  private data: number[] = [];
  constructor(private cmp: (a: number, b: number) => number) {}

  size(): number {
    return this.data.length;
  }

  peek(): number {
    if (this.data.length === 0) throw new Error('heap empty');
    return this.data[0];
  }

  push(v: number): void {
    this.data.push(v);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): number {
    if (this.data.length === 0) throw new Error('heap empty');
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.data[i], this.data[p]) < 0) {
        [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
        i = p;
      } else break;
    }
  }

  private sinkDown(i: number): void {
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let best = i;
      if (l < n && this.cmp(this.data[l], this.data[best]) < 0) best = l;
      if (r < n && this.cmp(this.data[r], this.data[best]) < 0) best = r;
      if (best === i) break;
      [this.data[i], this.data[best]] = [this.data[best], this.data[i]];
      i = best;
    }
  }
}

export class StreamingMedianTwoHeaps {
  private lower = new BinaryHeap((a, b) => b - a); // max-heap
  private upper = new BinaryHeap((a, b) => a - b); // min-heap

  add(v: number): void {
    if (!Number.isFinite(v)) throw new Error('StreamingMedianTwoHeaps: non-finite');
    if (this.lower.size() === 0 || v <= this.lower.peek()) this.lower.push(v);
    else this.upper.push(v);
    // rebalance
    if (this.lower.size() > this.upper.size() + 1) this.upper.push(this.lower.pop());
    else if (this.upper.size() > this.lower.size()) this.lower.push(this.upper.pop());
  }

  size(): number {
    return this.lower.size() + this.upper.size();
  }

  median(): number {
    if (this.size() === 0) throw new Error('StreamingMedianTwoHeaps: empty');
    if (this.lower.size() > this.upper.size()) return this.lower.peek();
    return (this.lower.peek() + this.upper.peek()) / 2;
  }
}

export function streamingMedianTwoHeaps(values: number[]): number[] {
  if (!Array.isArray(values)) throw new Error('streamingMedianTwoHeaps: values must be array');
  const m = new StreamingMedianTwoHeaps();
  const out: number[] = [];
  for (const v of values) {
    m.add(v);
    out.push(m.median());
  }
  return out;
}
