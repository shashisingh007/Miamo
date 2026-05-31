export function hilbertIndexToXY(order: number, index: number): { x: number; y: number } {
  if (!Number.isInteger(order) || order < 0) throw new RangeError('order must be a non-negative integer');
  const n = 1 << order;
  const max = n * n;
  if (!Number.isInteger(index) || index < 0 || index >= max) {
    throw new RangeError('index out of range');
  }
  let x = 0;
  let y = 0;
  let t = index;
  for (let s = 1; s < n; s <<= 1) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) { x = s - 1 - x; y = s - 1 - y; }
      const tmp = x; x = y; y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return { x, y };
}

export function hilbertXYToIndex(order: number, x: number, y: number): number {
  if (!Number.isInteger(order) || order < 0) throw new RangeError('order must be a non-negative integer');
  const n = 1 << order;
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= n || y >= n) {
    throw new RangeError('x/y out of range');
  }
  let cx = x;
  let cy = y;
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (cx & s) > 0 ? 1 : 0;
    const ry = (cy & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) { cx = s - 1 - cx; cy = s - 1 - cy; }
      const tmp = cx; cx = cy; cy = tmp;
    }
  }
  return d;
}
