import { describe, it, expect } from 'vitest';
import { negotiateContentType } from '../contentNegotiation';

describe('contentNegotiation', () => {
  it('exact match wins', () => {
    const r = negotiateContentType('application/json', [
      { type: 'text/html' },
      { type: 'application/json' },
    ]);
    expect(r.type).toBe('application/json');
  });

  it('subtype wildcard matches', () => {
    const r = negotiateContentType('application/*', [{ type: 'application/json' }]);
    expect(r.type).toBe('application/json');
  });

  it('star/star falls back to first offer', () => {
    const r = negotiateContentType('*/*', [
      { type: 'text/html' },
      { type: 'application/json' },
    ]);
    expect(r.type).toBe('text/html');
  });

  it('q-values prioritize correctly', () => {
    const r = negotiateContentType('text/html;q=0.5, application/json;q=0.9', [
      { type: 'text/html' },
      { type: 'application/json' },
    ]);
    expect(r.type).toBe('application/json');
  });

  it('q=0 rejects that type', () => {
    const r = negotiateContentType('application/json;q=0, */*;q=0.1', [
      { type: 'application/json' },
      { type: 'text/html' },
    ]);
    expect(r.type).toBe('text/html');
  });

  it('no match -> null', () => {
    const r = negotiateContentType('text/xml', [{ type: 'application/json' }]);
    expect(r.type).toBeNull();
  });

  it('empty/missing accept header -> first offer', () => {
    expect(negotiateContentType('', [{ type: 'application/json' }]).type).toBe('application/json');
    expect(negotiateContentType(null, [{ type: 'text/plain' }]).type).toBe('text/plain');
    expect(negotiateContentType(undefined, [{ type: 'text/plain' }]).type).toBe('text/plain');
  });

  it('no offers -> null', () => {
    expect(negotiateContentType('*/*', []).type).toBeNull();
  });

  it('case-insensitive matching', () => {
    const r = negotiateContentType('Application/JSON', [{ type: 'application/json' }]);
    expect(r.type).toBe('application/json');
  });

  it('specific beats wildcard at equal q', () => {
    const r = negotiateContentType('*/*, application/json', [
      { type: 'text/html' },
      { type: 'application/json' },
    ]);
    expect(r.type).toBe('application/json');
  });

  it('offer q-weight multiplies', () => {
    const r = negotiateContentType('text/html, application/json', [
      { type: 'text/html', q: 0.1 },
      { type: 'application/json', q: 0.9 },
    ]);
    expect(r.type).toBe('application/json');
  });

  it('invalid q parsed as 1 (ignored)', () => {
    const r = negotiateContentType('application/json;q=banana', [{ type: 'application/json' }]);
    expect(r.type).toBe('application/json');
    expect(r.q).toBeCloseTo(1, 5);
  });

  it('order is tie-breaker among same q+specificity', () => {
    const r = negotiateContentType('text/html, application/json', [
      { type: 'text/html' },
      { type: 'application/json' },
    ]);
    expect(r.type).toBe('text/html');
  });
});
