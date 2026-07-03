import { describe, it, expect } from 'vitest';
import { buildErasurePlan, DEFAULT_ERASURE_CATALOGUE } from '../erasurePlan';

describe('buildErasurePlan', () => {
  it('rejects empty userId', () => {
    expect(() => buildErasurePlan('', [])).toThrow();
  });

  it('returns empty steps for empty catalogue', () => {
    const p = buildErasurePlan('u1', []);
    expect(p.steps).toEqual([]);
    expect(p.summary).toEqual({ delete: 0, anonymise: 0, retain: 0 });
  });

  it('counts actions correctly in summary', () => {
    const p = buildErasurePlan('u1', DEFAULT_ERASURE_CATALOGUE.slice());
    expect(p.summary.delete + p.summary.anonymise + p.summary.retain)
      .toBe(DEFAULT_ERASURE_CATALOGUE.length);
    expect(p.summary.retain).toBeGreaterThan(0);
    expect(p.summary.delete).toBeGreaterThan(0);
  });

  it('orders delete before anonymise before retain', () => {
    const p = buildErasurePlan('u1', DEFAULT_ERASURE_CATALOGUE.slice());
    const actions = p.steps.map((s) => s.action);
    const firstAnon = actions.indexOf('anonymise');
    const firstRetain = actions.indexOf('retain');
    const lastDelete = actions.lastIndexOf('delete');
    if (firstAnon !== -1) expect(lastDelete).toBeLessThan(firstAnon);
    if (firstRetain !== -1 && firstAnon !== -1) expect(firstAnon).toBeLessThan(firstRetain);
  });

  it('within a single action, runs deeper (FK leaves) first', () => {
    const p = buildErasurePlan('u1', [
      { table: 'parent', ownerColumn: 'id', action: 'delete', depth: 1 },
      { table: 'leaf',   ownerColumn: 'id', action: 'delete', depth: 5 },
    ]);
    expect(p.steps.map((s) => s.table)).toEqual(['leaf', 'parent']);
  });

  it('ties broken by table name ascending', () => {
    const p = buildErasurePlan('u1', [
      { table: 'b', ownerColumn: 'id', action: 'delete', depth: 1 },
      { table: 'a', ownerColumn: 'id', action: 'delete', depth: 1 },
    ]);
    expect(p.steps.map((s) => s.table)).toEqual(['a', 'b']);
  });

  it('preserves piiColumns on anonymise + retainReason on retain', () => {
    const p = buildErasurePlan('u1', [
      { table: 'Profile', ownerColumn: 'userId', action: 'anonymise', depth: 1, piiColumns: ['email'] },
      { table: 'AuditLog', ownerColumn: 'userId', action: 'retain', depth: 0, retainReason: 'security' },
    ]);
    const prof = p.steps.find((s) => s.table === 'Profile')!;
    const audit = p.steps.find((s) => s.table === 'AuditLog')!;
    expect(prof.piiColumns).toEqual(['email']);
    expect(audit.retainReason).toBe('security');
  });

  it('does not mutate the catalogue', () => {
    const cat = DEFAULT_ERASURE_CATALOGUE.slice();
    const snap = JSON.stringify(cat);
    buildErasurePlan('u1', cat);
    expect(JSON.stringify(cat)).toBe(snap);
  });

  it('default catalogue retains AuditLog and PaymentTransaction', () => {
    const p = buildErasurePlan('u1', DEFAULT_ERASURE_CATALOGUE.slice());
    const retained = p.steps.filter((s) => s.action === 'retain').map((s) => s.table);
    expect(retained).toContain('AuditLog');
    expect(retained).toContain('PaymentTransaction');
  });

  it('default catalogue anonymises User and Profile (keeps row, strips PII)', () => {
    const p = buildErasurePlan('u1', DEFAULT_ERASURE_CATALOGUE.slice());
    const anon = p.steps.filter((s) => s.action === 'anonymise').map((s) => s.table);
    expect(anon).toContain('User');
    expect(anon).toContain('Profile');
  });

  it('echoes userId on the plan', () => {
    expect(buildErasurePlan('alice', []).userId).toBe('alice');
  });
});
