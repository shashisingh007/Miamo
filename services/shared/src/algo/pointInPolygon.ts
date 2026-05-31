export interface Point2D {
  x: number;
  y: number;
}

export type PointInPolygonResult = 'inside' | 'outside' | 'boundary';

function onSegment(p: Point2D, a: Point2D, b: Point2D, eps: number): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (Math.abs(cross) > eps) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < -eps) return false;
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (dot > lenSq + eps) return false;
  return true;
}

export function pointInPolygon(
  point: Point2D,
  polygon: Point2D[],
  options: { eps?: number } = {},
): PointInPolygonResult {
  if (!point || typeof point.x !== 'number' || typeof point.y !== 'number')
    throw new Error('pointInPolygon: point with x,y required');
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new Error('pointInPolygon: point coords must be finite');
  if (!Array.isArray(polygon) || polygon.length < 3)
    throw new Error('pointInPolygon: polygon needs >= 3 vertices');
  for (const v of polygon) {
    if (!v || typeof v.x !== 'number' || typeof v.y !== 'number')
      throw new Error('pointInPolygon: polygon vertices must have numeric x,y');
    if (!Number.isFinite(v.x) || !Number.isFinite(v.y))
      throw new Error('pointInPolygon: polygon vertices must be finite');
  }
  const eps = options.eps ?? 1e-12;
  const n = polygon.length;
  // boundary test
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    if (onSegment(point, a, b, eps)) return 'boundary';
  }
  // ray casting
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersect =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersect) inside = !inside;
  }
  return inside ? 'inside' : 'outside';
}
