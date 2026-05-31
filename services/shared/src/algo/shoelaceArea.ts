export interface Point2D {
  x: number;
  y: number;
}

export function shoelaceArea(polygon: Point2D[]): number {
  if (!Array.isArray(polygon)) throw new Error('shoelaceArea: polygon array required');
  if (polygon.length < 3) throw new Error('shoelaceArea: polygon must have >= 3 vertices');
  for (const p of polygon) {
    if (!p || typeof p.x !== 'number' || typeof p.y !== 'number')
      throw new Error('shoelaceArea: vertices must have numeric x and y');
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
      throw new Error('shoelaceArea: vertices must be finite');
  }
  return Math.abs(signedShoelaceArea(polygon));
}

export function signedShoelaceArea(polygon: Point2D[]): number {
  if (!Array.isArray(polygon)) throw new Error('signedShoelaceArea: polygon array required');
  if (polygon.length < 3) throw new Error('signedShoelaceArea: polygon must have >= 3 vertices');
  let sum = 0;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % n];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

export function shoelaceOrientation(polygon: Point2D[]): 'ccw' | 'cw' | 'degenerate' {
  const s = signedShoelaceArea(polygon);
  if (s > 0) return 'ccw';
  if (s < 0) return 'cw';
  return 'degenerate';
}
