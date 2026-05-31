import { describe, it, expect } from 'vitest';
import { rerankMMR } from '../mmr';

type Item = { id: string; score: number; tag: string };

const tagSim = (a: Item, b: Item): number => (a.tag === b.tag ? 1 : 0);

describe('rerankMMR', () => {
  it('returns input unchanged for <=1 item', () => {
    expect(rerankMMR([], tagSim)).toEqual([]);
    const one = [{ id: 'a', score: 50, tag: 'x' }];
    expect(rerankMMR(one, tagSim)).toEqual(one);
  });

  it('picks highest-score first', () => {
    const out = rerankMMR<Item>([
      { id: 'a', score: 50, tag: 'x' },
      { id: 'b', score: 90, tag: 'y' },
      { id: 'c', score: 70, tag: 'z' },
    ], tagSim);
    expect(out[0].id).toBe('b');
  });

  it('avoids picking the same tag back-to-back (diversity)', () => {
    const out = rerankMMR<Item>([
      { id: 'a1', score: 100, tag: 'x' },
      { id: 'a2', score: 99,  tag: 'x' },
      { id: 'b1', score: 80,  tag: 'y' },
    ], tagSim, { lambda: 0.5 });
    expect(out[0].id).toBe('a1');
    expect(out[1].tag).toBe('y'); // diversity beats raw score
  });

  it('lambda=1 reduces to pure relevance (descending by score)', () => {
    const out = rerankMMR<Item>([
      { id: 'a1', score: 100, tag: 'x' },
      { id: 'a2', score: 99,  tag: 'x' },
      { id: 'b1', score: 80,  tag: 'y' },
    ], tagSim, { lambda: 1 });
    expect(out.map((x) => x.id)).toEqual(['a1', 'a2', 'b1']);
  });

  it('honours k truncation', () => {
    const out = rerankMMR<Item>([
      { id: 'a', score: 50, tag: 'x' },
      { id: 'b', score: 60, tag: 'y' },
      { id: 'c', score: 40, tag: 'z' },
    ], tagSim, { k: 2 });
    expect(out).toHaveLength(2);
  });

  it('does not mutate the input array', () => {
    const items: Item[] = [
      { id: 'a', score: 50, tag: 'x' }, { id: 'b', score: 60, tag: 'y' },
    ];
    const snapshot = JSON.stringify(items);
    rerankMMR(items, tagSim);
    expect(JSON.stringify(items)).toBe(snapshot);
  });
});
