export interface Point2D {
  x: number;
  y: number;
}

function cross(o: Point2D, a: Point2D, b: Point2D): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function grahamScanConvexHull(points: Point2D[]): Point2D[] {
  const n = points.length;
  if (n === 0) return [];
  if (n === 1) return [{ x: points[0].x, y: points[0].y }];

  const unique = new Map<string, Point2D>();
  for (const p of points) unique.set(`${p.x},${p.y}`, p);
  const pts = Array.from(unique.values());
  if (pts.length === 1) return [{ x: pts[0].x, y: pts[0].y }];

  let pivotIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].y < pts[pivotIdx].y || (pts[i].y === pts[pivotIdx].y && pts[i].x < pts[pivotIdx].x)) {
      pivotIdx = i;
    }
  }
  const pivot = pts[pivotIdx];
  pts[pivotIdx] = pts[0];
  pts[0] = pivot;

  const rest = pts.slice(1);
  rest.sort((a, b) => {
    const c = cross(pivot, a, b);
    if (c !== 0) return c > 0 ? -1 : 1;
    const da = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
    const db = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
    return da - db;
  });

  const stack: Point2D[] = [pivot];
  for (const p of rest) {
    while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], p) <= 0) {
      stack.pop();
    }
    stack.push(p);
  }
  return stack;
}
