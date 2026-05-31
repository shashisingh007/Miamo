// Sweep-line algorithm for the union-of-axis-aligned-rectangles area problem.
// Each rectangle is [x1, y1, x2, y2] with x1<=x2 and y1<=y2.
// Coordinate-compress y values, then sweep events left-to-right while
// maintaining a counter array over y intervals.

export interface SweepRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function sweepLineRectangleArea(rects: SweepRect[]): number {
  if (!Array.isArray(rects)) throw new Error('sweepLineRectangleArea: rects must be array');
  for (const r of rects) {
    if (!r || typeof r !== 'object') throw new Error('sweepLineRectangleArea: bad rect');
    if (!Number.isFinite(r.x1) || !Number.isFinite(r.y1) || !Number.isFinite(r.x2) || !Number.isFinite(r.y2)) {
      throw new Error('sweepLineRectangleArea: rect coords must be finite');
    }
    if (r.x1 > r.x2 || r.y1 > r.y2) throw new Error('sweepLineRectangleArea: x1<=x2 and y1<=y2 required');
  }
  if (rects.length === 0) return 0;

  // events: (x, type, y1, y2); type +1 = entering, -1 = leaving
  type Ev = { x: number; type: 1 | -1; y1: number; y2: number };
  const events: Ev[] = [];
  const ys = new Set<number>();
  for (const r of rects) {
    if (r.x1 === r.x2 || r.y1 === r.y2) continue; // degenerate, area 0
    events.push({ x: r.x1, type: 1, y1: r.y1, y2: r.y2 });
    events.push({ x: r.x2, type: -1, y1: r.y1, y2: r.y2 });
    ys.add(r.y1);
    ys.add(r.y2);
  }
  if (events.length === 0) return 0;
  events.sort((a, b) => a.x - b.x);

  const ySorted = Array.from(ys).sort((a, b) => a - b);
  const idx = new Map<number, number>();
  for (let i = 0; i < ySorted.length; i += 1) idx.set(ySorted[i], i);
  const segCount = ySorted.length - 1;
  const cnt = new Array<number>(segCount).fill(0);

  function coveredLength(): number {
    let s = 0;
    for (let i = 0; i < segCount; i += 1) {
      if (cnt[i] > 0) s += ySorted[i + 1] - ySorted[i];
    }
    return s;
  }

  let total = 0;
  let prevX = events[0].x;
  for (const ev of events) {
    if (ev.x !== prevX) {
      total += coveredLength() * (ev.x - prevX);
      prevX = ev.x;
    }
    const i1 = idx.get(ev.y1)!;
    const i2 = idx.get(ev.y2)!;
    for (let i = i1; i < i2; i += 1) cnt[i] += ev.type;
  }
  return total;
}

export function sweepLineRectangleUnionArea() {
  return { sweepLineRectangleArea };
}
