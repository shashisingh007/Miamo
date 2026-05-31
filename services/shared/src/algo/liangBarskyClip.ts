// Liang-Barsky line clipping. Clips a parametric segment against an
// axis-aligned rectangle and returns the clipped segment (or null when
// the segment lies entirely outside).

export interface Rect {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface Segment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function liangBarskyClip(seg: Segment, r: Rect): Segment | null {
  if (r.xmin > r.xmax || r.ymin > r.ymax) {
    throw new RangeError('invalid rectangle');
  }
  const dx = seg.x1 - seg.x0;
  const dy = seg.y1 - seg.y0;
  const p = [-dx, dx, -dy, dy];
  const q = [seg.x0 - r.xmin, r.xmax - seg.x0, seg.y0 - r.ymin, r.ymax - seg.y0];
  let u1 = 0;
  let u2 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
      continue;
    }
    const t = q[i] / p[i];
    if (p[i] < 0) {
      if (t > u2) return null;
      if (t > u1) u1 = t;
    } else {
      if (t < u1) return null;
      if (t < u2) u2 = t;
    }
  }
  return {
    x0: seg.x0 + u1 * dx,
    y0: seg.y0 + u1 * dy,
    x1: seg.x0 + u2 * dx,
    y1: seg.y0 + u2 * dy,
  };
}
