export interface CartesianTreeNode {
  value: number;
  index: number;
  left: CartesianTreeNode | null;
  right: CartesianTreeNode | null;
}

export function buildCartesianTreeMinHeap(values: number[]): CartesianTreeNode | null {
  if (values.length === 0) return null;
  const stack: CartesianTreeNode[] = [];
  for (let i = 0; i < values.length; i++) {
    const node: CartesianTreeNode = { value: values[i], index: i, left: null, right: null };
    let last: CartesianTreeNode | null = null;
    while (stack.length > 0 && stack[stack.length - 1].value > node.value) {
      last = stack.pop()!;
    }
    node.left = last;
    if (stack.length > 0) stack[stack.length - 1].right = node;
    stack.push(node);
  }
  return stack[0];
}

export function inorderTraversal(root: CartesianTreeNode | null): number[] {
  const out: number[] = [];
  const visit = (n: CartesianTreeNode | null): void => {
    if (n === null) return;
    visit(n.left);
    out.push(n.index);
    visit(n.right);
  };
  visit(root);
  return out;
}

export function rangeMinIndex(root: CartesianTreeNode | null, lo: number, hi: number): number {
  if (root === null) throw new RangeError('tree is empty');
  if (lo > hi) throw new RangeError('lo must be <= hi');
  let best: { value: number; index: number } | null = null;
  const visit = (n: CartesianTreeNode | null): void => {
    if (n === null) return;
    if (n.index < lo) { visit(n.right); return; }
    if (n.index > hi) { visit(n.left); return; }
    if (best === null || n.value < best.value) best = { value: n.value, index: n.index };
    visit(n.left);
    visit(n.right);
  };
  visit(root);
  if (best === null) throw new RangeError('range out of bounds');
  return (best as { value: number; index: number }).index;
}
