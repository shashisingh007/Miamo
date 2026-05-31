// Visvalingam-Whyatt polyline simplification. Iteratively removes the
// vertex with the smallest associated triangle area until either the
// minimum area exceeds the tolerance or only the endpoints remain.

export interface Point {
  x: number;
  y: number;
}

interface Node {
  i: number;
  prev: number;
  next: number;
  area: number;
}

function triArea(a: Point, b: Point, c: Point): number {
  return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

export function visvalingamSimplify(points: Point[], minArea: number): Point[] {
  if (!(minArea >= 0)) throw new RangeError('minArea must be >= 0');
  const n = points.length;
  if (n <= 2) return points.slice();
  const nodes: Node[] = new Array(n);
  for (let i = 0; i < n; i++) {
    nodes[i] = { i, prev: i - 1, next: i + 1, area: Infinity };
  }
  for (let i = 1; i < n - 1; i++) {
    nodes[i].area = triArea(points[i - 1], points[i], points[i + 1]);
  }
  while (true) {
    let minIdx = -1;
    let minA = Infinity;
    for (let k = 0; k < n; k++) {
      const node = nodes[k];
      if (node.prev < 0 || node.next >= n) continue; // endpoint or removed
      if (node.area < minA) {
        minA = node.area;
        minIdx = k;
      }
    }
    if (minIdx < 0 || minA > minArea) break;
    const removed = nodes[minIdx];
    const p = removed.prev;
    const q = removed.next;
    nodes[p].next = q;
    nodes[q].prev = p;
    removed.prev = -1;
    removed.next = n; // mark removed
    if (nodes[p].prev >= 0 && nodes[p].next < n) {
      nodes[p].area = triArea(points[nodes[p].prev], points[p], points[nodes[p].next]);
    }
    if (nodes[q].prev >= 0 && nodes[q].next < n) {
      nodes[q].area = triArea(points[nodes[q].prev], points[q], points[nodes[q].next]);
    }
  }
  const out: Point[] = [];
  let cur = 0;
  while (cur < n) {
    out.push(points[cur]);
    cur = nodes[cur].next;
  }
  return out;
}
