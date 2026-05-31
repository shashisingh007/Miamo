/**
 * Generic binary min-heap priority queue.
 *
 *   const pq = createPriorityQueue<Job>((a, b) => a.priority - b.priority);
 *   pq.push(job);  // O(log n)
 *   pq.pop();      // O(log n) — returns smallest by comparator
 *
 * Pure data structure: holds an internal array; methods mutate it in-place.
 * Returns a new fresh queue each time `createPriorityQueue` is called.
 */

export type Comparator<T> = (a: T, b: T) => number;

export interface PriorityQueue<T> {
  push(item: T): void;
  pop(): T | undefined;
  peek(): T | undefined;
  readonly size: number;
  toSortedArray(): T[];
  clear(): void;
}

function siftUp<T>(arr: T[], cmp: Comparator<T>, startIndex: number): void {
  let i = startIndex;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (cmp(arr[i], arr[parent]) < 0) {
      [arr[i], arr[parent]] = [arr[parent], arr[i]];
      i = parent;
    } else {
      break;
    }
  }
}

function siftDown<T>(arr: T[], cmp: Comparator<T>, startIndex: number): void {
  const n = arr.length;
  let i = startIndex;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let smallest = i;
    if (left < n && cmp(arr[left], arr[smallest]) < 0) smallest = left;
    if (right < n && cmp(arr[right], arr[smallest]) < 0) smallest = right;
    if (smallest === i) break;
    [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
    i = smallest;
  }
}

export function createPriorityQueue<T>(
  cmp: Comparator<T>,
  initial?: ReadonlyArray<T>
): PriorityQueue<T> {
  if (typeof cmp !== 'function') {
    throw new TypeError('comparator must be a function');
  }
  const heap: T[] = [];
  if (initial && initial.length > 0) {
    // heapify in O(n)
    for (const x of initial) heap.push(x);
    for (let i = (heap.length >> 1) - 1; i >= 0; i--) {
      siftDown(heap, cmp, i);
    }
  }
  return {
    push(item: T) {
      heap.push(item);
      siftUp(heap, cmp, heap.length - 1);
    },
    pop(): T | undefined {
      const n = heap.length;
      if (n === 0) return undefined;
      const top = heap[0];
      const last = heap.pop()!;
      if (n > 1) {
        heap[0] = last;
        siftDown(heap, cmp, 0);
      }
      return top;
    },
    peek(): T | undefined {
      return heap.length === 0 ? undefined : heap[0];
    },
    get size() {
      return heap.length;
    },
    toSortedArray(): T[] {
      const copy = heap.slice();
      const out: T[] = [];
      // build a temporary queue from the copy without disturbing heap
      const tmp = createPriorityQueue(cmp, copy);
      while (tmp.size > 0) out.push(tmp.pop()!);
      return out;
    },
    clear() {
      heap.length = 0;
    },
  };
}
