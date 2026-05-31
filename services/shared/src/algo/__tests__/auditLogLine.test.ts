import { describe, it, expect } from 'vitest';
import { buildAuditLine, serialiseAuditLine } from '../auditLogLine';

const NOW = 1_700_000_000_000;

describe('auditLogLine', () => {
  it('builds the minimal shape', () => {
    const l = buildAuditLine({ nowMs: NOW, action: 'auth.login', outcome: 'success' });
    expect(l.action).toBe('auth.login');
    expect(l.outcome).toBe('success');
    expect(l.ts).toBe(new Date(NOW).toISOString());
    expect(l.actor).toBeUndefined();
    expect(l.target).toBeUndefined();
    expect(l.ctx).toBeUndefined();
  });

  it('includes optional actor / target / requestId', () => {
    const l = buildAuditLine({
      nowMs: NOW, action: 'data.export', outcome: 'denied',
      actorUidHash: 'h_actor', targetUidHash: 'h_target', requestId: 'req-1',
    });
    expect(l.actor).toEqual({ uidHash: 'h_actor' });
    expect(l.target).toEqual({ uidHash: 'h_target' });
    expect(l.requestId).toBe('req-1');
  });

  it('rejects malformed actions', () => {
    expect(() => buildAuditLine({ nowMs: NOW, action: 'bad action', outcome: 'success' })).toThrow();
    expect(() => buildAuditLine({ nowMs: NOW, action: '', outcome: 'success' })).toThrow();
    expect(() => buildAuditLine({ nowMs: NOW, action: 'NoDots', outcome: 'success' })).toThrow();
  });

  it('rejects invalid outcome', () => {
    expect(() => buildAuditLine({ nowMs: NOW, action: 'a.b', outcome: 'bogus' as any })).toThrow();
  });

  it('ctx allow-list: keeps scalars, drops everything else', () => {
    const l = buildAuditLine({
      nowMs: NOW, action: 'a.b', outcome: 'success',
      ctx: {
        keep_str: 'ok',
        keep_num: 7,
        keep_bool: true,
        bad_obj: { a: 1 },
        bad_arr: [1, 2],
        bad_nan: Number.NaN,
        bad_long: 'x'.repeat(300),
        'bad key!': 'x',
      } as any,
    });
    expect(l.ctx).toEqual({ keep_str: 'ok', keep_num: 7, keep_bool: true });
  });

  it('strips newlines from ctx string values', () => {
    const l = buildAuditLine({
      nowMs: NOW, action: 'a.b', outcome: 'success',
      ctx: { msg: 'line1\nline2\rline3' },
    });
    expect(l.ctx?.msg).toBe('line1 line2 line3');
  });

  it('omits ctx when empty after sanitisation', () => {
    const l = buildAuditLine({ nowMs: NOW, action: 'a.b', outcome: 'success', ctx: { 'bad key!': 'x' } });
    expect(l.ctx).toBeUndefined();
  });

  it('serialiseAuditLine produces single-line JSON', () => {
    const l = buildAuditLine({ nowMs: NOW, action: 'a.b', outcome: 'success', ctx: { x: 1 } });
    const s = serialiseAuditLine(l);
    expect(s.includes('\n')).toBe(false);
    expect(JSON.parse(s)).toEqual(l);
  });

  it('clamps negative nowMs to epoch', () => {
    const l = buildAuditLine({ nowMs: -10, action: 'a.b', outcome: 'success' });
    expect(l.ts).toBe(new Date(0).toISOString());
  });

  it('accepts nested action with up to 3 dots', () => {
    expect(buildAuditLine({ nowMs: NOW, action: 'a.b.c.d', outcome: 'success' }).action).toBe('a.b.c.d');
    expect(() => buildAuditLine({ nowMs: NOW, action: 'a.b.c.d.e', outcome: 'success' })).toThrow();
  });
});
