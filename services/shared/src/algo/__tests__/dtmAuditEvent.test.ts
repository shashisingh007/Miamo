import { describe, it, expect } from 'vitest';
import { buildDtmAuditEvent, canonicalize } from '../dtmAuditEvent';

const VALID = {
  eventId: '01J0ABCDEF',
  userHash: 'deadbeefcafef00d',
  action: 'answer.ingested' as const,
  algoVersion: 'dtm.v6.3',
  atMs: 1_700_000_000_000,
};

describe('buildDtmAuditEvent', () => {
  it('builds a valid event with defaults', () => {
    const e = buildDtmAuditEvent(VALID);
    expect(e.outcomeCode).toBe('ok');
    expect(e.topic).toBeNull();
    expect(e.userHash).toBe(VALID.userHash);
  });

  it('accepts a topic when supplied', () => {
    const e = buildDtmAuditEvent({ ...VALID, topic: 'values' });
    expect(e.topic).toBe('values');
  });

  it('accepts a custom outcomeCode', () => {
    const e = buildDtmAuditEvent({ ...VALID, outcomeCode: 'noop' });
    expect(e.outcomeCode).toBe('noop');
  });

  it('rejects raw uid in userHash field', () => {
    expect(() => buildDtmAuditEvent({ ...VALID, userHash: 'alice@example.com' })).toThrow(/userHash/);
  });

  it('rejects too-long eventId', () => {
    expect(() => buildDtmAuditEvent({ ...VALID, eventId: 'x'.repeat(100) })).toThrow(/eventId/);
  });

  it('rejects empty eventId', () => {
    expect(() => buildDtmAuditEvent({ ...VALID, eventId: '' })).toThrow(/eventId/);
  });

  it('rejects non-finite or non-positive atMs', () => {
    expect(() => buildDtmAuditEvent({ ...VALID, atMs: 0 })).toThrow(/atMs/);
    expect(() => buildDtmAuditEvent({ ...VALID, atMs: NaN })).toThrow(/atMs/);
  });

  it('rejects free-text outcomeCode', () => {
    expect(() => buildDtmAuditEvent({ ...VALID, outcomeCode: 'something long with spaces' })).toThrow(/outcomeCode/);
  });
});

describe('canonicalize', () => {
  it('produces identical strings for identical events', () => {
    const a = buildDtmAuditEvent(VALID);
    const b = buildDtmAuditEvent(VALID);
    expect(canonicalize(a)).toBe(canonicalize(b));
  });
  it('is independent of input key order', () => {
    const e1 = buildDtmAuditEvent(VALID);
    const e2 = buildDtmAuditEvent({
      atMs: VALID.atMs, algoVersion: VALID.algoVersion,
      action: VALID.action, userHash: VALID.userHash, eventId: VALID.eventId,
    });
    expect(canonicalize(e1)).toBe(canonicalize(e2));
  });
  it('changes when any field changes', () => {
    const a = canonicalize(buildDtmAuditEvent(VALID));
    const b = canonicalize(buildDtmAuditEvent({ ...VALID, outcomeCode: 'err' }));
    expect(a).not.toBe(b);
  });
});
