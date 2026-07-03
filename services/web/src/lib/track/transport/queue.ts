/**
 * Bounded ring buffer for queued events. When full, oldest are evicted —
 * tracking is lossy on purpose, so a stuck network never blows up RAM.
 */
import type { TrackEvent } from '../types';

export class RingQueue<T> {
  private buf: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private _size = 0;
  private dropped = 0;

  constructor(public readonly capacity = 256) {
    this.buf = new Array(capacity);
  }

  push(item: T): void {
    if (this._size === this.capacity) {
      // evict oldest
      this.head = (this.head + 1) % this.capacity;
      this._size -= 1;
      this.dropped += 1;
    }
    this.buf[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this._size += 1;
  }

  drain(max: number = this.capacity): T[] {
    const out: T[] = [];
    const n = Math.min(max, this._size);
    for (let i = 0; i < n; i++) {
      const item = this.buf[this.head] as T;
      this.buf[this.head] = undefined;
      this.head = (this.head + 1) % this.capacity;
      this._size -= 1;
      out.push(item);
    }
    return out;
  }

  get size(): number {
    return this._size;
  }

  get droppedCount(): number {
    return this.dropped;
  }
}

// Convenience alias typed for events.
export class EventQueue extends RingQueue<TrackEvent> {}
