import { describe, it, expect } from 'vitest';
import { decideRoute, type RoutingRule } from '../routingRuleMatcher';

const req = (path: string, method = 'GET', headers: [string, string][] = []) => ({
  method,
  path,
  headers: new Map(headers),
});

describe('routingRuleMatcher', () => {
  it('no rules -> not matched', () => {
    expect(decideRoute([], req('/x'))).toEqual({ matched: false });
  });

  it('path_prefix match', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'a', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/api' }], target: 'api' },
    ];
    const d = decideRoute(rules, req('/api/users'));
    expect(d.matched && d.target).toBe('api');
  });

  it('non-matching prefix', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'a', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/api' }], target: 'api' },
    ];
    expect(decideRoute(rules, req('/web'))).toEqual({ matched: false });
  });

  it('method predicate (case insensitive)', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'a', priority: 1, predicates: [{ kind: 'method', methods: ['GET', 'POST'] }], target: 'r' },
    ];
    expect(decideRoute(rules, req('/x', 'post')).matched).toBe(true);
    expect(decideRoute(rules, req('/x', 'DELETE')).matched).toBe(false);
  });

  it('header equals (case-insensitive name)', () => {
    const rules: RoutingRule<string>[] = [
      {
        id: 'a',
        priority: 1,
        predicates: [{ kind: 'header', name: 'X-Tenant', equals: 'acme' }],
        target: 'r',
      },
    ];
    expect(decideRoute(rules, req('/x', 'GET', [['x-tenant', 'acme']])).matched).toBe(true);
    expect(decideRoute(rules, req('/x', 'GET', [['x-tenant', 'other']])).matched).toBe(false);
  });

  it('header_present matches without value check', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'a', priority: 1, predicates: [{ kind: 'header_present', name: 'authorization' }], target: 'auth' },
    ];
    expect(decideRoute(rules, req('/x', 'GET', [['Authorization', 'Bearer x']])).matched).toBe(true);
  });

  it('all predicates must match (AND)', () => {
    const rules: RoutingRule<string>[] = [
      {
        id: 'a',
        priority: 1,
        predicates: [
          { kind: 'path_prefix', prefix: '/api' },
          { kind: 'method', methods: ['POST'] },
        ],
        target: 'r',
      },
    ];
    expect(decideRoute(rules, req('/api/x', 'POST')).matched).toBe(true);
    expect(decideRoute(rules, req('/api/x', 'GET')).matched).toBe(false);
  });

  it('higher priority wins', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'low', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/' }], target: 'low' },
      { id: 'high', priority: 10, predicates: [{ kind: 'path_prefix', prefix: '/api' }], target: 'high' },
    ];
    const d = decideRoute(rules, req('/api/x'));
    expect(d.matched && d.target).toBe('high');
  });

  it('ties broken by rule id', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'b', priority: 5, predicates: [{ kind: 'path_prefix', prefix: '/' }], target: 'B' },
      { id: 'a', priority: 5, predicates: [{ kind: 'path_prefix', prefix: '/' }], target: 'A' },
    ];
    const d = decideRoute(rules, req('/x'));
    expect(d.matched && d.target).toBe('A');
  });

  it('skips rules with no predicates', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'empty', priority: 100, predicates: [], target: 'no' },
      { id: 'real', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/' }], target: 'yes' },
    ];
    const d = decideRoute(rules, req('/x'));
    expect(d.matched && d.target).toBe('yes');
  });

  it('header missing -> header predicate false', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'a', priority: 1, predicates: [{ kind: 'header', name: 'x-key', equals: '1' }], target: 'r' },
    ];
    expect(decideRoute(rules, req('/x')).matched).toBe(false);
  });

  it('first matching rule wins among same priority', () => {
    const rules: RoutingRule<string>[] = [
      { id: 'aa', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/api' }], target: '1' },
      { id: 'bb', priority: 1, predicates: [{ kind: 'path_prefix', prefix: '/api' }], target: '2' },
    ];
    const d = decideRoute(rules, req('/api/x'));
    expect(d.matched && d.target).toBe('1');
  });
});
