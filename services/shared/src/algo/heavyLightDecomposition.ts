// Heavy-light decomposition supporting point-update + path-sum on a rooted tree.

export interface HldInput {
  n: number;
  parent: number[]; // -1 for root
  values?: number[];
}

export class HeavyLightDecomposition {
  private readonly n: number;
  private readonly parent: number[];
  private readonly depth: number[];
  private readonly heavy: number[];
  private readonly head: number[];
  private readonly pos: number[];
  private readonly tree: number[]; // Fenwick BIT
  private readonly children: number[][];
  private readonly root: number;

  constructor(input: HldInput) {
    const { n, parent } = input;
    if (!Number.isInteger(n) || n <= 0) throw new RangeError('n must be a positive integer');
    if (parent.length !== n) throw new RangeError('parent.length must equal n');
    let rootIdx = -1;
    for (let i = 0; i < n; i += 1) {
      if (parent[i] === -1) {
        if (rootIdx !== -1) throw new RangeError('multiple roots');
        rootIdx = i;
      } else if (!Number.isInteger(parent[i]) || parent[i] < 0 || parent[i] >= n) {
        throw new RangeError('invalid parent entry');
      }
    }
    if (rootIdx === -1) throw new RangeError('no root');
    this.n = n;
    this.parent = parent.slice();
    this.depth = new Array(n).fill(0);
    this.heavy = new Array(n).fill(-1);
    this.head = new Array(n).fill(0);
    this.pos = new Array(n).fill(0);
    this.tree = new Array(n + 1).fill(0);
    this.children = Array.from({ length: n }, () => [] as number[]);
    this.root = rootIdx;
    for (let i = 0; i < n; i += 1) {
      if (parent[i] !== -1) this.children[parent[i]].push(i);
    }
    this.computeHeavyAndDepth(rootIdx);
    this.decompose();
    const values = input.values ?? new Array(n).fill(0);
    if (values.length !== n) throw new RangeError('values.length must equal n');
    for (let i = 0; i < n; i += 1) this.update(i, values[i]);
  }

  private computeHeavyAndDepth(root: number): void {
    // iterative post-order to compute subtree sizes; also depth
    const order: number[] = [];
    const stack: number[] = [root];
    const visited = new Uint8Array(this.n);
    while (stack.length > 0) {
      const u = stack[stack.length - 1];
      if (!visited[u]) {
        visited[u] = 1;
        for (const c of this.children[u]) {
          this.depth[c] = this.depth[u] + 1;
          stack.push(c);
        }
      } else {
        order.push(stack.pop()!);
      }
    }
    const size = new Array(this.n).fill(1);
    for (const u of order) {
      let maxC = -1;
      let maxS = 0;
      for (const c of this.children[u]) {
        size[u] += size[c];
        if (size[c] > maxS) {
          maxS = size[c];
          maxC = c;
        }
      }
      this.heavy[u] = maxC;
    }
  }

  private decompose(): void {
    let counter = 0;
    const dfsStack: { u: number; h: number }[] = [{ u: this.root, h: this.root }];
    while (dfsStack.length > 0) {
      const { u, h } = dfsStack.pop()!;
      let cur = u;
      let curHead = h;
      // walk down the heavy chain
      while (cur !== -1) {
        this.head[cur] = curHead;
        this.pos[cur] = counter++;
        // schedule light children
        for (const c of this.children[cur]) {
          if (c !== this.heavy[cur]) dfsStack.push({ u: c, h: c });
        }
        cur = this.heavy[cur];
      }
    }
  }

  private bitUpdate(i: number, delta: number): void {
    let idx = i + 1;
    while (idx <= this.n) {
      this.tree[idx] += delta;
      idx += idx & -idx;
    }
  }

  private bitPrefix(i: number): number {
    let s = 0;
    let idx = i + 1;
    while (idx > 0) {
      s += this.tree[idx];
      idx -= idx & -idx;
    }
    return s;
  }

  private bitRange(lo: number, hi: number): number {
    if (lo > hi) return 0;
    return this.bitPrefix(hi) - (lo > 0 ? this.bitPrefix(lo - 1) : 0);
  }

  private currentValue(u: number): number {
    return this.bitRange(this.pos[u], this.pos[u]);
  }

  update(u: number, value: number): void {
    if (!Number.isInteger(u) || u < 0 || u >= this.n) throw new RangeError('node out of range');
    if (!Number.isFinite(value)) throw new TypeError('value must be finite');
    const cur = this.currentValue(u);
    this.bitUpdate(this.pos[u], value - cur);
  }

  pathSum(u: number, v: number): number {
    if (!Number.isInteger(u) || u < 0 || u >= this.n) throw new RangeError('u out of range');
    if (!Number.isInteger(v) || v < 0 || v >= this.n) throw new RangeError('v out of range');
    let res = 0;
    let a = u;
    let b = v;
    while (this.head[a] !== this.head[b]) {
      if (this.depth[this.head[a]] < this.depth[this.head[b]]) {
        const t = a;
        a = b;
        b = t;
      }
      res += this.bitRange(this.pos[this.head[a]], this.pos[a]);
      a = this.parent[this.head[a]];
    }
    if (this.depth[a] > this.depth[b]) {
      const t = a;
      a = b;
      b = t;
    }
    res += this.bitRange(this.pos[a], this.pos[b]);
    return res;
  }
}
