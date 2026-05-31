interface RadixNode<V> {
  edge: string;
  value?: V;
  hasValue: boolean;
  children: RadixNode<V>[];
}

export class RadixTreePrefix<V> {
  private root: RadixNode<V> = { edge: '', hasValue: false, children: [] };

  insert(key: string, value: V): void {
    if (key.length === 0) {
      this.root.value = value;
      this.root.hasValue = true;
      return;
    }
    this.insertInto(this.root, key, value);
  }

  private insertInto(node: RadixNode<V>, key: string, value: V): void {
    for (const child of node.children) {
      const lcp = commonPrefixLength(child.edge, key);
      if (lcp === 0) continue;
      if (lcp === child.edge.length) {
        if (lcp === key.length) {
          child.value = value;
          child.hasValue = true;
        } else {
          this.insertInto(child, key.slice(lcp), value);
        }
        return;
      }
      const split: RadixNode<V> = {
        edge: child.edge.slice(lcp),
        value: child.value,
        hasValue: child.hasValue,
        children: child.children,
      };
      child.edge = child.edge.slice(0, lcp);
      child.value = undefined;
      child.hasValue = false;
      child.children = [split];
      if (lcp === key.length) {
        child.value = value;
        child.hasValue = true;
      } else {
        child.children.push({
          edge: key.slice(lcp),
          value,
          hasValue: true,
          children: [],
        });
      }
      return;
    }
    node.children.push({ edge: key, value, hasValue: true, children: [] });
  }

  get(key: string): V | undefined {
    let node = this.root;
    let rest = key;
    if (rest.length === 0) return node.hasValue ? node.value : undefined;
    while (rest.length > 0) {
      const child = node.children.find((c) => rest.startsWith(c.edge));
      if (!child) return undefined;
      rest = rest.slice(child.edge.length);
      node = child;
    }
    return node.hasValue ? node.value : undefined;
  }

  hasPrefix(prefix: string): boolean {
    let node = this.root;
    let rest = prefix;
    while (rest.length > 0) {
      const child = node.children.find(
        (c) => rest.startsWith(c.edge) || c.edge.startsWith(rest),
      );
      if (!child) return false;
      if (child.edge.startsWith(rest)) return true;
      rest = rest.slice(child.edge.length);
      node = child;
    }
    return true;
  }

  collectByPrefix(prefix: string): string[] {
    let node = this.root;
    let rest = prefix;
    let consumed = '';
    while (rest.length > 0) {
      const child = node.children.find(
        (c) => rest.startsWith(c.edge) || c.edge.startsWith(rest),
      );
      if (!child) return [];
      if (child.edge.startsWith(rest)) {
        consumed += child.edge;
        node = child;
        rest = '';
        break;
      }
      consumed += child.edge;
      rest = rest.slice(child.edge.length);
      node = child;
    }
    const out: string[] = [];
    walk(node, consumed, out);
    return out;
  }
}

function commonPrefixLength(a: string, b: string): number {
  const lim = Math.min(a.length, b.length);
  let i = 0;
  while (i < lim && a[i] === b[i]) i += 1;
  return i;
}

function walk<V>(node: RadixNode<V>, prefix: string, out: string[]): void {
  if (node.hasValue) out.push(prefix);
  for (const c of node.children) walk(c, prefix + c.edge, out);
}
