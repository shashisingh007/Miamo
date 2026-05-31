// Bresenham's line algorithm. Returns integer pixels along the line from
// (x0,y0) to (x1,y1), inclusive of both endpoints. Works for any octant.

export interface Pixel {
  x: number;
  y: number;
}

export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Pixel[] {
  if (![x0, y0, x1, y1].every((v) => Number.isInteger(v))) {
    throw new RangeError('endpoints must be integers');
  }
  const out: Pixel[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    out.push({ x, y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return out;
}
