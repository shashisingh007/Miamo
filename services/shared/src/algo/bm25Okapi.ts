// BM25 Okapi ranker — classic IR scoring with k1, b parameters.
// Tokens are pre-split strings; corpus-level statistics built once on add.

export interface Bm25Options {
  k1?: number;
  b?: number;
}

interface Doc {
  id: string;
  length: number;
  termFreq: Map<string, number>;
}

export class Bm25Okapi {
  private readonly k1: number;
  private readonly b: number;
  private docs: Doc[] = [];
  private docFreq = new Map<string, number>(); // term -> # docs containing it
  private avgLen = 0;
  private sealed = false;

  constructor(options: Bm25Options = {}) {
    const k1 = options.k1 ?? 1.5;
    const b = options.b ?? 0.75;
    if (!Number.isFinite(k1) || k1 < 0) throw new RangeError('k1 must be a non-negative finite number');
    if (!Number.isFinite(b) || b < 0 || b > 1) throw new RangeError('b must be in [0,1]');
    this.k1 = k1;
    this.b = b;
  }

  addDocument(id: string, tokens: string[]): void {
    if (this.sealed) throw new Error('index already sealed; cannot add more documents');
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('id must be a non-empty string');
    }
    if (!Array.isArray(tokens)) throw new TypeError('tokens must be an array');
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    this.docs.push({ id, length: tokens.length, termFreq: tf });
    for (const term of tf.keys()) {
      this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1);
    }
  }

  seal(): void {
    if (this.docs.length === 0) {
      this.avgLen = 0;
    } else {
      let total = 0;
      for (const d of this.docs) total += d.length;
      this.avgLen = total / this.docs.length;
    }
    this.sealed = true;
  }

  size(): number {
    return this.docs.length;
  }

  private idf(term: string): number {
    const n = this.docs.length;
    const df = this.docFreq.get(term) ?? 0;
    // BM25+ style IDF (always positive)
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  scoreDocument(docId: string, query: string[]): number {
    if (!this.sealed) throw new Error('index must be sealed before scoring');
    const doc = this.docs.find((d) => d.id === docId);
    if (!doc) throw new RangeError(`unknown docId: ${docId}`);
    let score = 0;
    const norm = this.avgLen === 0 ? 0 : doc.length / this.avgLen;
    for (const term of query) {
      const f = doc.termFreq.get(term);
      if (!f) continue;
      const num = f * (this.k1 + 1);
      const den = f + this.k1 * (1 - this.b + this.b * norm);
      score += this.idf(term) * (num / den);
    }
    return score;
  }

  rank(query: string[], topK = 10): { id: string; score: number }[] {
    if (!this.sealed) throw new Error('index must be sealed before ranking');
    if (!Number.isInteger(topK) || topK <= 0) throw new RangeError('topK must be a positive integer');
    const scores: { id: string; score: number }[] = [];
    for (const d of this.docs) {
      const s = this.scoreDocument(d.id, query);
      if (s > 0) scores.push({ id: d.id, score: s });
    }
    scores.sort((a, b) => (b.score - a.score) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return scores.slice(0, topK);
  }
}
