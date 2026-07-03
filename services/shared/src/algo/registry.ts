/**
 * Algorithm registry — every v4 algo registers the tracking event names it
 * consumes. The tests/algo-signal-coverage.test.ts walks this registry to
 * prove no tracked event becomes dead data.
 */
export type RegisteredAlgo = {
  name: string;
  surface: string;
  usesEvents: readonly string[];
  weights: Readonly<Record<string, number>>;
};

const registry: RegisteredAlgo[] = [];
export function registerAlgo(a: RegisteredAlgo): void { registry.push(a); }
export function getRegistry(): readonly RegisteredAlgo[] { return registry; }

/** All event names referenced by at least one algo. */
export function usedEvents(): Set<string> {
  const s = new Set<string>();
  for (const a of registry) for (const e of a.usesEvents) s.add(e);
  return s;
}
