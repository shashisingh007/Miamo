// Cohen-Sutherland line clipping against an axis-aligned rectangle. Returns
// the clipped segment or null when the segment lies entirely outside.

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

const INSIDE = 0;
const LEFT = 1;
const RIGHT = 2;
const BOTTOM = 4;
const TOP = 8;

function code(x: number, y: number, r: Rect): number {
  let c = INSIDE;
  if (x < r.xmin) c |= LEFT;
  else if (x > r.xmax) c |= RIGHT;
  if (y < r.ymin) c |= BOTTOM;
  else if (y > r.ymax) c |= TOP;
  return c;
}

export function cohenSutherlandClip(seg: Segment, r: Rect): Segment | null {
  if (r.xmin > r.xmax || r.ymin > r.ymax) {
    throw new RangeError('invalid rectangle');
  }
  let { x0, y0, x1, y1 } = seg;
  let c0 = code(x0, y0, r);
  let c1 = code(x1, y1, r);
  while (true) {
    if ((c0 | c1) === 0) return { x0, y0, x1, y1 };
    if ((c0 & c1) !== 0) return null;
    const out = c0 !== 0 ? c0 : c1;
    let x = 0;
    let y = 0;
    if ((out & TOP) !== 0) {
      x = x0 + ((x1 - x0) * (r.ymax - y0)) / (y1 - y0);
      y = r.ymax;
    } else if ((out & BOTTOM) !== 0) {
      x = x0 + ((x1 - x0) * (r.ymin - y0)) / (y1 - y0);
      y = r.ymin;
    } else if ((out & RIGHT) !== 0) {
      y = y0 + ((y1 - y0) * (r.xmax - x0)) / (x1 - x0);
      x = r.xmax;
    } else if ((out & LEFT) !== 0) {
      y = y0 + ((y1 - y0) * (r.xmin - x0)) / (x1 - x0);
      x = r.xmin;
    }
    if (out === c0) {
      x0 = x;
      y0 = y;
      c0 = code(x0, y0, r);
    } else {
      x1 = x;
      y1 = y;
      c1 = code(x1, y1, r);
    }
  }
}
