import { describe, it, expect } from 'vitest';
import { checkPermission, type PermissionMatrix } from '../permissionMatrix';

const MATRIX: PermissionMatrix = {
  guest: { permissions: ['posts:read'] },
  user: { permissions: ['posts:read', 'posts:write', 'profile:*'] },
  mod: { permissions: ['posts:delete'], inherits: ['user'] },
  admin: { permissions: ['*:*', '!secrets:write'] },
  cycle_a: { permissions: ['a:read'], inherits: ['cycle_b'] },
  cycle_b: { permissions: ['b:read'], inherits: ['cycle_a'] },
};

describe('permissionMatrix', () => {
  it('unknown role denied', () => {
    expect(checkPermission(MATRIX, 'ghost', 'posts', 'read').reason).toBe('unknown_role');
  });

  it('direct permission allowed', () => {
    const r = checkPermission(MATRIX, 'user', 'posts', 'write');
    expect(r.allowed).toBe(true);
    expect(r.matched).toBe('posts:write');
  });

  it('no_match when role lacks perm', () => {
    expect(checkPermission(MATRIX, 'guest', 'posts', 'write').reason).toBe('no_match');
  });

  it('resource wildcard works', () => {
    const r = checkPermission(MATRIX, 'user', 'profile', 'edit');
    expect(r.allowed).toBe(true);
    expect(r.matched).toBe('profile:*');
  });

  it('global wildcard works for admin', () => {
    expect(checkPermission(MATRIX, 'admin', 'whatever', 'read').allowed).toBe(true);
  });

  it('explicit deny overrides wildcard allow', () => {
    const r = checkPermission(MATRIX, 'admin', 'secrets', 'write');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('explicit_deny');
  });

  it('admin still allowed on secrets:read', () => {
    expect(checkPermission(MATRIX, 'admin', 'secrets', 'read').allowed).toBe(true);
  });

  it('inheritance grants parent permissions', () => {
    const r = checkPermission(MATRIX, 'mod', 'posts', 'write');
    expect(r.allowed).toBe(true);
  });

  it('mod-specific permission also allowed', () => {
    expect(checkPermission(MATRIX, 'mod', 'posts', 'delete').allowed).toBe(true);
  });

  it('inheritance cycles do not loop', () => {
    const r = checkPermission(MATRIX, 'cycle_a', 'b', 'read');
    expect(r.allowed).toBe(true);
  });

  it('deny rule format with action wildcard works', () => {
    const m: PermissionMatrix = { x: { permissions: ['*:*', '!billing:*'] } };
    expect(checkPermission(m, 'x', 'billing', 'read').reason).toBe('explicit_deny');
    expect(checkPermission(m, 'x', 'other', 'read').allowed).toBe(true);
  });
});
