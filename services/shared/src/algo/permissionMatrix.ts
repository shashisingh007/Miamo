/**
 * permissionMatrix \u2014 Phase 20 OWASP A01 RBAC permission matrix (pure).
 *
 * Maps roles to allowed `resource:action` permissions. Supports
 * wildcard `*` on either side (`*:read`, `posts:*`, `*:*`), explicit
 * deny entries (prefix `!`), and role inheritance via `inherits`.
 */
export type RoleDef = {
  permissions: ReadonlyArray<string>;
  inherits?: ReadonlyArray<string>;
};

export type PermissionMatrix = Readonly<Record<string, RoleDef>>;

export type PermissionDecision = {
  allowed: boolean;
  matched: string | null;     // the rule that decided
  reason: 'explicit_deny' | 'allowed' | 'no_match' | 'unknown_role';
};

function expandPerms(matrix: PermissionMatrix, role: string, seen: Set<string>): string[] {
  if (seen.has(role)) return [];
  seen.add(role);
  const def = matrix[role];
  if (!def) return [];
  const out: string[] = [...def.permissions];
  for (const parent of def.inherits ?? []) {
    out.push(...expandPerms(matrix, parent, seen));
  }
  return out;
}

function ruleMatches(rule: string, resource: string, action: string): boolean {
  const [rRes, rAct] = rule.split(':');
  if (rRes !== '*' && rRes !== resource) return false;
  if (rAct !== '*' && rAct !== action) return false;
  return true;
}

export function checkPermission(
  matrix: PermissionMatrix,
  role: string,
  resource: string,
  action: string,
): PermissionDecision {
  if (!matrix[role]) return { allowed: false, matched: null, reason: 'unknown_role' };
  const perms = expandPerms(matrix, role, new Set());

  // Deny rules win
  for (const p of perms) {
    if (p.startsWith('!') && ruleMatches(p.slice(1), resource, action)) {
      return { allowed: false, matched: p, reason: 'explicit_deny' };
    }
  }
  for (const p of perms) {
    if (!p.startsWith('!') && ruleMatches(p, resource, action)) {
      return { allowed: true, matched: p, reason: 'allowed' };
    }
  }
  return { allowed: false, matched: null, reason: 'no_match' };
}
