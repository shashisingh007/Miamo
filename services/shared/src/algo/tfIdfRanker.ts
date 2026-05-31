export interface TfIdfDocument {
  id: string;
  tokens: string[];
}

export interface TfIdfRanking {
  id: string;
  score: number;
}

export class TfIdfRanker {
  private readonly docs: Map<string, Map<string, number>> = new Map();
  private readonly docLengths: Map<string, number> = new Map();
  private readonly df: Map<string, number> = new Map();
  private readonly docCount: number;

  constructor(documents: TfIdfDocument[]) {
    for (const d of documents) {
      if (this.docs.has(d.id)) throw new RangeError(`duplicate document id: ${d.id}`);
      const tf = new Map<string, number>();
      for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      this.docs.set(d.id, tf);
      this.docLengths.set(d.id, d.tokens.length);
      for (const term of tf.keys()) this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }
    this.docCount = documents.length;
  }

  size(): number {
    return this.docCount;
  }

  rank(query: string[], topK?: number): TfIdfRanking[] {
    if (this.docCount === 0) return [];
    if (topK !== undefined && topK < 0) throw new RangeError('topK must be >= 0');
    const queryTerms = new Set(query);
    const results: TfIdfRanking[] = [];
    for (const [id, tf] of this.docs.entries()) {
      const len = this.docLengths.get(id) ?? 0;
      if (len === 0) { results.push({ id, score: 0 }); continue; }
      let score = 0;
      for (const term of queryTerms) {
        const tfCount = tf.get(term) ?? 0;
        if (tfCount === 0) continue;
        const df = this.df.get(term) ?? 0;
        const idf = Math.log((this.docCount + 1) / (df + 1)) + 1;
        score += (tfCount / len) * idf;
      }
      results.push({ id, score });
    }
    results.sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));
    if (topK !== undefined) results.length = Math.min(results.length, topK);
    return results;
  }
}
