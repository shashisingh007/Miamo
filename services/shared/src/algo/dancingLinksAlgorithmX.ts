// Knuth's Algorithm X (dancing links via array-based simulation) for the exact
// cover problem. Given a 0/1 matrix, find a subset of rows such that each
// column is covered exactly once.

export interface ExactCoverProblem {
  columnCount: number;
  rows: ReadonlyArray<ReadonlyArray<number>>; // each row = list of column indices
}

export interface ExactCoverSolution {
  rows: number[]; // indices into problem.rows
}

interface Node {
  left: number;
  right: number;
  up: number;
  down: number;
  col: number; // column header index, or self for headers
  rowId: number; // original row id, -1 for headers
}

interface Column {
  size: number;
  name: number; // column index 0..columnCount-1
}

export function dancingLinksAlgorithmX(problem: ExactCoverProblem): ExactCoverSolution | null {
  if (!problem || !Number.isInteger(problem.columnCount) || problem.columnCount < 0) {
    throw new RangeError('columnCount must be a non-negative integer');
  }
  if (!Array.isArray(problem.rows)) throw new TypeError('rows must be an array');
  const C = problem.columnCount;
  for (const r of problem.rows) {
    if (!Array.isArray(r)) throw new TypeError('each row must be an array');
    for (const c of r) {
      if (!Number.isInteger(c) || c < 0 || c >= C) {
        throw new RangeError(`row contains bad column index ${c}`);
      }
    }
  }

  const nodes: Node[] = [];
  const cols: Column[] = [];

  // root header at index 0
  const root = nodes.length;
  nodes.push({ left: 0, right: 0, up: 0, down: 0, col: -1, rowId: -1 });
  cols.push({ size: 0, name: -1 });

  // create C column headers
  const headerIds: number[] = [];
  for (let i = 0; i < C; i += 1) {
    const id = nodes.length;
    nodes.push({ left: 0, right: 0, up: id, down: id, col: id, rowId: -1 });
    cols.push({ size: 0, name: i });
    headerIds.push(id);
    // splice into header row
    const last = nodes[root].left;
    nodes[id].right = root;
    nodes[id].left = last;
    nodes[last].right = id;
    nodes[root].left = id;
  }

  // insert rows
  for (let r = 0; r < problem.rows.length; r += 1) {
    const cells = problem.rows[r];
    if (cells.length === 0) continue;
    let firstInRow = -1;
    for (const c of cells) {
      const colHeader = headerIds[c];
      const id = nodes.length;
      const up = nodes[colHeader].up;
      nodes.push({ left: id, right: id, up, down: colHeader, col: colHeader, rowId: r });
      nodes[up].down = id;
      nodes[colHeader].up = id;
      cols[colHeader].size += 1;
      if (firstInRow === -1) {
        firstInRow = id;
      } else {
        const last = nodes[firstInRow].left;
        nodes[id].right = firstInRow;
        nodes[id].left = last;
        nodes[last].right = id;
        nodes[firstInRow].left = id;
      }
    }
  }

  function cover(colHeader: number): void {
    nodes[nodes[colHeader].right].left = nodes[colHeader].left;
    nodes[nodes[colHeader].left].right = nodes[colHeader].right;
    for (let i = nodes[colHeader].down; i !== colHeader; i = nodes[i].down) {
      for (let j = nodes[i].right; j !== i; j = nodes[j].right) {
        nodes[nodes[j].down].up = nodes[j].up;
        nodes[nodes[j].up].down = nodes[j].down;
        cols[nodes[j].col].size -= 1;
      }
    }
  }

  function uncover(colHeader: number): void {
    for (let i = nodes[colHeader].up; i !== colHeader; i = nodes[i].up) {
      for (let j = nodes[i].left; j !== i; j = nodes[j].left) {
        cols[nodes[j].col].size += 1;
        nodes[nodes[j].down].up = j;
        nodes[nodes[j].up].down = j;
      }
    }
    nodes[nodes[colHeader].right].left = colHeader;
    nodes[nodes[colHeader].left].right = colHeader;
  }

  const solution: number[] = [];

  function search(): boolean {
    if (nodes[root].right === root) return true;
    // choose column with smallest size (S heuristic)
    let best = -1;
    let bestSize = Number.POSITIVE_INFINITY;
    for (let c = nodes[root].right; c !== root; c = nodes[c].right) {
      if (cols[c].size < bestSize) {
        bestSize = cols[c].size;
        best = c;
        if (bestSize === 0) break;
      }
    }
    if (best === -1 || bestSize === 0) return false;
    cover(best);
    for (let r = nodes[best].down; r !== best; r = nodes[r].down) {
      solution.push(nodes[r].rowId);
      for (let j = nodes[r].right; j !== r; j = nodes[j].right) cover(nodes[j].col);
      if (search()) return true;
      solution.pop();
      for (let j = nodes[r].left; j !== r; j = nodes[j].left) uncover(nodes[j].col);
    }
    uncover(best);
    return false;
  }

  return search() ? { rows: [...solution].sort((a, b) => a - b) } : null;
}
