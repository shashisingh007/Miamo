// Running median over a stream using two heaps.

class MinHeap {
  private heap: number[] = [];

  size(): number {
    return this.heap.length;
  }

  peek(): number | undefined {
    return this.heap[0];
  }

  push(value: number): void {
    this.heap.push(value);
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >>> 1;
      if (this.heap[p] <= this.heap[i]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  pop(): number | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      let i = 0;
      const n = this.heap.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < n && this.heap[l] < this.heap[smallest]) smallest = l;
        if (r < n && this.heap[r] < this.heap[smallest]) smallest = r;
        if (smallest === i) break;
        [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

class MaxHeap {
  private inner = new MinHeap();

  size(): number {
    return this.inner.size();
  }

  peek(): number | undefined {
    const v = this.inner.peek();
    return v === undefined ? undefined : -v;
  }

  push(value: number): void {
    this.inner.push(-value);
  }

  pop(): number | undefined {
    const v = this.inner.pop();
    return v === undefined ? undefined : -v;
  }
}

export class RunningMedianStream {
  private low = new MaxHeap();
  private high = new MinHeap();

  add(value: number): void {
    if (!Number.isFinite(value)) throw new TypeError('value must be a finite number');
    if (this.low.size() === 0 || value <= this.low.peek()!) this.low.push(value);
    else this.high.push(value);
    if (this.low.size() > this.high.size() + 1) {
      this.high.push(this.low.pop()!);
    } else if (this.high.size() > this.low.size()) {
      this.low.push(this.high.pop()!);
    }
  }

  median(): number | undefined {
    if (this.low.size() === 0) return undefined;
    if (this.low.size() > this.high.size()) return this.low.peek();
    return (this.low.peek()! + this.high.peek()!) / 2;
  }

  size(): number {
    return this.low.size() + this.high.size();
  }
}
