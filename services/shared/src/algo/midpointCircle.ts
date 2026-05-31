// Midpoint circle algorithm. Returns integer pixel coordinates of a circle
// of given radius centered at (cx, cy). Symmetric octants are reflected to
// produce a complete rasterized circle. Pixels are deduplicated.

export interface Pixel {
  x: number;
  y: number;
}

export function midpointCircle(cx: number, cy: number, radius: number): Pixel[] {
  if (!Number.isInteger(cx) || !Number.isInteger(cy) || !Number.isInteger(radius)) {
    throw new RangeError('center and radius must be integers');
  }
  if (radius < 0) throw new RangeError('radius must be >= 0');
  if (radius === 0) return [{ x: cx, y: cy }];
  const seen = new Set<string>();
  const out: Pixel[] = [];
  const push = (x: number, y: number) => {
    const k = `${x},${y}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ x, y });
  };
  let x = radius;
  let y = 0;
  let err = 1 - x;
  while (x >= y) {
    push(cx + x, cy + y);
    push(cx - x, cy + y);
    push(cx + x, cy - y);
    push(cx - x, cy - y);
    push(cx + y, cy + x);
    push(cx - y, cy + x);
    push(cx + y, cy - x);
    push(cx - y, cy - x);
    y += 1;
    if (err < 0) {
      err += 2 * y + 1;
    } else {
      x -= 1;
      err += 2 * (y - x) + 1;
    }
  }
  return out;
}
