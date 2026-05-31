export function treeToPruferSequence(parent: number[]): number[] {
  const n = parent.length;
  if (n === 0) throw new RangeError('tree must have >= 1 vertex');
  if (n === 1) return [];
  if (n === 2) return [];
  if (parent[n - 1] !== -1) throw new RangeError('root (last vertex) must have parent -1');
  for (let i = 0; i < n - 1; i++) {
    if (parent[i] < 0 || parent[i] >= n || parent[i] === i) {
      throw new RangeError('invalid parent entry');
    }
  }
  const degree = new Array<number>(n).fill(0);
  for (let i = 0; i < n - 1; i++) {
    degree[i] += 1;
    degree[parent[i]] += 1;
  }
  const par = parent.slice();
  const leaves: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] === 1) leaves.push(i);
  leaves.sort((a, b) => a - b);

  const seq: number[] = [];
  for (let step = 0; step < n - 2; step++) {
    const leaf = leaves.shift()!;
    const p = par[leaf];
    seq.push(p);
    degree[leaf] -= 1;
    degree[p] -= 1;
    if (degree[p] === 1 && p !== n - 1) {
      let lo = 0;
      let hi = leaves.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (leaves[mid] < p) lo = mid + 1;
        else hi = mid;
      }
      leaves.splice(lo, 0, p);
    } else if (degree[p] === 1 && p === n - 1) {
      // root reaches degree 1 — still goes into sequence in later iterations as parent.
    }
  }
  return seq;
}

export function pruferSequenceToEdges(seq: number[], vertexCount: number): Array<[number, number]> {
  const n = vertexCount;
  if (n < 1) throw new RangeError('vertexCount must be >= 1');
  if (seq.length !== Math.max(0, n - 2)) throw new RangeError('seq length must be n-2');
  for (const x of seq) {
    if (x < 0 || x >= n) throw new RangeError('seq entry out of range');
  }
  if (n === 1) return [];
  if (n === 2) return [[0, 1]];
  const degree = new Array<number>(n).fill(1);
  for (const x of seq) degree[x] += 1;
  const edges: Array<[number, number]> = [];
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] === 1) queue.push(i);
  queue.sort((a, b) => a - b);
  for (const s of seq) {
    const leaf = queue.shift()!;
    edges.push([leaf, s]);
    degree[leaf] -= 1;
    degree[s] -= 1;
    if (degree[s] === 1) {
      let lo = 0;
      let hi = queue.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (queue[mid] < s) lo = mid + 1;
        else hi = mid;
      }
      queue.splice(lo, 0, s);
    }
  }
  const remaining: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] === 1) remaining.push(i);
  if (remaining.length === 2) edges.push([remaining[0], remaining[1]]);
  return edges;
}
