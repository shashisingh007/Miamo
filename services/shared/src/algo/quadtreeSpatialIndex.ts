export interface QuadPoint {
  x: number;
  y: number;
}

export interface QuadBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface Node {
  bounds: QuadBox;
  points: QuadPoint[];
  children: Node[] | null;
}

function intersects(a: QuadBox, b: QuadBox): boolean {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
}

function contains(box: QuadBox, p: QuadPoint): boolean {
  return p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY;
}

export class QuadtreeSpatialIndex {
  private readonly root: Node;
  private readonly capacity: number;
  private readonly maxDepth: number;

  constructor(bounds: QuadBox, capacity = 4, maxDepth = 12) {
    if (capacity < 1) throw new RangeError('capacity must be >= 1');
    if (maxDepth < 1) throw new RangeError('maxDepth must be >= 1');
    if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
      throw new RangeError('invalid bounds');
    }
    this.capacity = capacity;
    this.maxDepth = maxDepth;
    this.root = { bounds, points: [], children: null };
  }

  insert(point: QuadPoint): boolean {
    if (!contains(this.root.bounds, point)) return false;
    this.insertInto(this.root, point, 0);
    return true;
  }

  private insertInto(node: Node, point: QuadPoint, depth: number): void {
    if (node.children !== null) {
      for (const c of node.children) {
        if (contains(c.bounds, point)) {
          this.insertInto(c, point, depth + 1);
          return;
        }
      }
      node.points.push(point);
      return;
    }
    node.points.push(point);
    if (node.points.length > this.capacity && depth < this.maxDepth) {
      this.subdivide(node, depth);
    }
  }

  private subdivide(node: Node, depth: number): void {
    const { minX, minY, maxX, maxY } = node.bounds;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    node.children = [
      { bounds: { minX, minY, maxX: midX, maxY: midY }, points: [], children: null },
      { bounds: { minX: midX, minY, maxX, maxY: midY }, points: [], children: null },
      { bounds: { minX, minY: midY, maxX: midX, maxY }, points: [], children: null },
      { bounds: { minX: midX, minY: midY, maxX, maxY }, points: [], children: null },
    ];
    const remaining: QuadPoint[] = [];
    for (const p of node.points) {
      let placed = false;
      for (const c of node.children) {
        if (contains(c.bounds, p)) {
          this.insertInto(c, p, depth + 1);
          placed = true;
          break;
        }
      }
      if (!placed) remaining.push(p);
    }
    node.points = remaining;
  }

  queryRange(box: QuadBox): QuadPoint[] {
    const out: QuadPoint[] = [];
    this.collect(this.root, box, out);
    return out;
  }

  private collect(node: Node, box: QuadBox, out: QuadPoint[]): void {
    if (!intersects(node.bounds, box)) return;
    for (const p of node.points) {
      if (contains(box, p)) out.push(p);
    }
    if (node.children !== null) {
      for (const c of node.children) this.collect(c, box, out);
    }
  }
}
