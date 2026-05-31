export type RoutingPredicate =
  | { kind: 'header'; name: string; equals: string }
  | { kind: 'header_present'; name: string }
  | { kind: 'path_prefix'; prefix: string }
  | { kind: 'method'; methods: ReadonlyArray<string> };

export type RoutingRule<T> = {
  readonly id: string;
  readonly priority: number;
  readonly predicates: ReadonlyArray<RoutingPredicate>;
  readonly target: T;
};

export type RoutingRequest = {
  readonly method: string;
  readonly path: string;
  readonly headers: ReadonlyMap<string, string>;
};

export type RoutingDecision<T> =
  | { matched: true; ruleId: string; target: T }
  | { matched: false };

function normalizeHeaderName(s: string): string {
  return s.toLowerCase();
}

function predicateMatches(p: RoutingPredicate, req: RoutingRequest): boolean {
  switch (p.kind) {
    case 'method':
      return p.methods.some((m) => m.toUpperCase() === req.method.toUpperCase());
    case 'path_prefix':
      return req.path.startsWith(p.prefix);
    case 'header_present': {
      const name = normalizeHeaderName(p.name);
      for (const [k] of req.headers) {
        if (normalizeHeaderName(k) === name) return true;
      }
      return false;
    }
    case 'header': {
      const name = normalizeHeaderName(p.name);
      for (const [k, v] of req.headers) {
        if (normalizeHeaderName(k) === name) return v === p.equals;
      }
      return false;
    }
  }
}

export function decideRoute<T>(
  rules: ReadonlyArray<RoutingRule<T>>,
  req: RoutingRequest,
): RoutingDecision<T> {
  const sorted = rules.slice().sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  for (const rule of sorted) {
    if (rule.predicates.length === 0) continue;
    let ok = true;
    for (const p of rule.predicates) {
      if (!predicateMatches(p, req)) {
        ok = false;
        break;
      }
    }
    if (ok) return { matched: true, ruleId: rule.id, target: rule.target };
  }
  return { matched: false };
}
