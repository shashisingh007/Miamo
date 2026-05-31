// Trie-based prefix index for autocomplete suggestions.
// Stores strings with optional weights; queries return up to `limit` matches
// ordered by descending weight then lexicographic ascending.

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
  weight: number;
  word: string | null;
}

function makeNode(): TrieNode {
  return { children: new Map(), isWord: false, weight: 0, word: null };
}

export interface TrieAutocompleteOptions {
  caseSensitive?: boolean;
}

export class TrieAutocomplete {
  private readonly root: TrieNode = makeNode();
  private readonly caseSensitive: boolean;
  private size = 0;

  constructor(opts: TrieAutocompleteOptions = {}) {
    this.caseSensitive = opts.caseSensitive ?? false;
  }

  private norm(s: string): string {
    return this.caseSensitive ? s : s.toLowerCase();
  }

  insert(word: string, weight = 1): void {
    if (typeof word !== 'string') throw new TypeError('word must be a string');
    if (word.length === 0) throw new Error('word must be non-empty');
    if (!Number.isFinite(weight)) throw new Error('weight must be finite');
    const key = this.norm(word);
    let node = this.root;
    for (const ch of key) {
      let next = node.children.get(ch);
      if (!next) {
        next = makeNode();
        node.children.set(ch, next);
      }
      node = next;
    }
    if (!node.isWord) {
      this.size++;
      node.isWord = true;
    }
    node.weight = weight;
    node.word = word;
  }

  has(word: string): boolean {
    const node = this.locate(this.norm(word));
    return !!node && node.isWord;
  }

  get count(): number {
    return this.size;
  }

  private locate(prefix: string): TrieNode | null {
    let node: TrieNode = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  suggest(prefix: string, limit = 10): string[] {
    if (typeof prefix !== 'string') throw new TypeError('prefix must be a string');
    if (!Number.isInteger(limit) || limit < 1) throw new Error('limit must be a positive integer');
    const start = this.locate(this.norm(prefix));
    if (!start) return [];
    const collected: Array<{ word: string; weight: number }> = [];
    const walk = (node: TrieNode): void => {
      if (node.isWord && node.word !== null) collected.push({ word: node.word, weight: node.weight });
      for (const child of node.children.values()) walk(child);
    };
    walk(start);
    collected.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
    });
    return collected.slice(0, limit).map((x) => x.word);
  }
}
