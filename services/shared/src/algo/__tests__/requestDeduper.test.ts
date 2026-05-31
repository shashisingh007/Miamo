import { describe, it, expect } from 'vitest';
import { createRequestDeduper } from '../requestDeduper';

describe('requestDeduper', () => {
  it('returns same in-flight promise for same key', async () => {
    const d = createRequestDeduper<string>();
    let calls = 0;
    const fetcher = () =>
      new Promise<string>((resolve) => setTimeout(() => { calls++; resolve('ok'); }, 10));
    const p1 = d.dedupe('k', fetcher);
    const p2 = d.dedupe('k', fetcher);
    expect(p1).toBe(p2);
    await Promise.all([p1, p2]);
    expect(calls).toBe(1);
  });

  it('separate keys run independently', async () => {
    const d = createRequestDeduper<string>();
    let a = 0, b = 0;
    const pa = d.dedupe('a', async () => { a++; return 'a'; });
    const pb = d.dedupe('b', async () => { b++; return 'b'; });
    expect(pa).not.toBe(pb);
    await Promise.all([pa, pb]);
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  it('evicts on resolve so next call refetches', async () => {
    const d = createRequestDeduper<string>();
    let calls = 0;
    await d.dedupe('k', async () => { calls++; return 1; });
    expect(d.has('k')).toBe(false);
    await d.dedupe('k', async () => { calls++; return 2; });
    expect(calls).toBe(2);
  });

  it('evicts on reject', async () => {
    const d = createRequestDeduper<string>();
    await expect(d.dedupe('k', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(d.has('k')).toBe(false);
  });

  it('inFlight reflects pending count', async () => {
    const d = createRequestDeduper<string>();
    let resolve!: () => void;
    const p = d.dedupe('k', () => new Promise<void>((r) => { resolve = r; }));
    expect(d.inFlight()).toBe(1);
    resolve();
    await p;
    expect(d.inFlight()).toBe(0);
  });

  it('coalesced callers all receive same resolved value', async () => {
    const d = createRequestDeduper<string>();
    const p1 = d.dedupe('k', async () => 42);
    const p2 = d.dedupe('k', async () => 99); // ignored
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(42);
    expect(b).toBe(42);
  });

  it('coalesced callers all see same rejection', async () => {
    const d = createRequestDeduper<string>();
    const p1 = d.dedupe('k', async () => { throw new Error('x'); });
    const p2 = d.dedupe('k', async () => 'never');
    await expect(p1).rejects.toThrow('x');
    await expect(p2).rejects.toThrow('x');
  });

  it('clear() drops all entries', async () => {
    const d = createRequestDeduper<string>();
    let resolve!: () => void;
    d.dedupe('k', () => new Promise<void>((r) => { resolve = r; }));
    expect(d.inFlight()).toBe(1);
    d.clear();
    expect(d.inFlight()).toBe(0);
    resolve();
  });

  it('supports non-string key type', async () => {
    const d = createRequestDeduper<number>();
    const p1 = d.dedupe(7, async () => 'a');
    const p2 = d.dedupe(7, async () => 'b');
    expect(p1).toBe(p2);
    expect(await p1).toBe('a');
  });

  it('fetcher that throws synchronously is still wrapped', async () => {
    const d = createRequestDeduper<string>();
    const p = d.dedupe('k', () => { throw new Error('sync'); });
    await expect(p).rejects.toThrow('sync');
    expect(d.has('k')).toBe(false);
  });
});
