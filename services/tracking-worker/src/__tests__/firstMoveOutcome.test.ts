import { describe, it, expect } from 'vitest';
import { _internals } from '../firstMoveOutcome';

const { reconcileFirstMoves, readFirstMoveSendsFromMeta } = _internals;

describe('reconcileFirstMoves', () => {
  const sentAt = new Date('2026-05-31T10:00:00Z');

  it('marks replied when a read lands within window', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [{ reader: 'b', sender: 'a', readAt: new Date('2026-05-31T10:30:00Z') }],
    );
    expect(out[0].replied).toBe(true);
    expect(out[0].replyMs).toBe(30 * 60 * 1000);
  });

  it('marks not-replied when no read exists', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [],
    );
    expect(out[0].replied).toBe(false);
    expect(out[0].replyMs).toBeNull();
  });

  it('ignores reads outside the 24h window', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [{ reader: 'b', sender: 'a', readAt: new Date('2026-06-02T10:00:01Z') }],
    );
    expect(out[0].replied).toBe(false);
  });

  it('ignores reads BEFORE the send', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [{ reader: 'b', sender: 'a', readAt: new Date('2026-05-31T09:59:59Z') }],
    );
    expect(out[0].replied).toBe(false);
  });

  it('picks the FIRST qualifying read when multiple exist', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [
        { reader: 'b', sender: 'a', readAt: new Date('2026-05-31T11:00:00Z') }, // +1h
        { reader: 'b', sender: 'a', readAt: new Date('2026-05-31T15:00:00Z') }, // +5h
      ],
    );
    expect(out[0].replyMs).toBe(60 * 60 * 1000);
  });

  it('does not match reads from a different sender', () => {
    const out = reconcileFirstMoves(
      [{ aHash: 'a', bHash: 'b', sentAt, kind: 'text' }],
      [{ reader: 'b', sender: 'OTHER', readAt: new Date('2026-05-31T10:30:00Z') }],
    );
    expect(out[0].replied).toBe(false);
  });

  it('handles many sends and many reads efficiently', () => {
    const N = 500;
    const sends = Array.from({ length: N }, (_, i) => ({
      aHash: 'a', bHash: `b${i}`, sentAt: new Date(Date.UTC(2026, 4, 31, 0, i % 60)), kind: 'text',
    }));
    const reads = Array.from({ length: N }, (_, i) => ({
      reader: `b${i}`, sender: 'a',
      readAt: new Date(Date.UTC(2026, 4, 31, 1, i % 60)),
    }));
    const t0 = performance.now();
    const out = reconcileFirstMoves(sends, reads);
    const t1 = performance.now();
    expect(out.length).toBe(N);
    expect(out.every((o) => o.replied)).toBe(true);
    expect(t1 - t0).toBeLessThan(50);
  });
});

describe('readFirstMoveSendsFromMeta', () => {
  it('extracts sends from EventAggDaily meta.firstMove', () => {
    const rows = [
      {
        uidHash: 'a',
        meta: {
          firstMove: {
            'b1': { sentAtMs: 1716120000000, kind: 'text'  },
            'b2': { sentAtMs: 1716130000000, kind: 'voice' },
          },
        },
      },
    ];
    const sends = readFirstMoveSendsFromMeta(rows);
    expect(sends).toHaveLength(2);
    expect(sends[0].aHash).toBe('a');
    expect(['text', 'voice']).toContain(sends[0].kind);
  });

  it('skips rows without firstMove', () => {
    const sends = readFirstMoveSendsFromMeta([
      { uidHash: 'a', meta: null },
      { uidHash: 'a', meta: { firstMove: undefined } },
    ]);
    expect(sends).toEqual([]);
  });

  it('skips malformed entries', () => {
    const sends = readFirstMoveSendsFromMeta([
      {
        uidHash: 'a',
        meta: {
          firstMove: {
            // missing sentAtMs:
            'b1': { kind: 'text' } as unknown as { sentAtMs: number; kind: string },
            // valid:
            'b2': { sentAtMs: 1716120000000, kind: 'text' },
          },
        },
      },
    ]);
    expect(sends).toHaveLength(1);
    expect(sends[0].bHash).toBe('b2');
  });
});
