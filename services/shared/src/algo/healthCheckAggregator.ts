/**
 * healthCheckAggregator \u2014 Phase 18 multi-subsystem health aggregator (pure).
 *
 * Combines per-component health checks into an overall service status with
 * the worst severity winning, but with critical-vs-non-critical handling:
 * a `non-critical` component being `down` cannot make the overall `down`,
 * only `degraded`.
 *
 *   states:    'up' | 'degraded' | 'down' | 'unknown'
 *   criticality: 'critical' | 'optional'   (default 'critical')
 */

export type ComponentState = 'up' | 'degraded' | 'down' | 'unknown';
export type ComponentCriticality = 'critical' | 'optional';

export type ComponentCheck = {
  name: string;
  state: ComponentState;
  criticality?: ComponentCriticality;
  messageHint?: string;
};

export type AggregateHealthResult = {
  overall: ComponentState;
  components: ReadonlyArray<ComponentCheck & { criticality: ComponentCriticality }>;
  downCritical: string[];
  downOptional: string[];
  degraded: string[];
};

const RANK: Record<ComponentState, number> = {
  up: 0,
  unknown: 1,
  degraded: 2,
  down: 3,
};

function worst(a: ComponentState, b: ComponentState): ComponentState {
  return RANK[b] > RANK[a] ? b : a;
}

export function aggregateHealth(
  checks: ReadonlyArray<ComponentCheck>,
): AggregateHealthResult {
  if (!checks || checks.length === 0) {
    return { overall: 'unknown', components: [], downCritical: [], downOptional: [], degraded: [] };
  }

  const normalised = checks.map((c) => ({
    ...c,
    criticality: c.criticality ?? 'critical',
  })) as Array<ComponentCheck & { criticality: ComponentCriticality }>;

  let overall: ComponentState = 'up';
  const downCritical: string[] = [];
  const downOptional: string[] = [];
  const degraded: string[] = [];

  for (const c of normalised) {
    if (c.state === 'down') {
      if (c.criticality === 'critical') {
        downCritical.push(c.name);
        overall = worst(overall, 'down');
      } else {
        downOptional.push(c.name);
        overall = worst(overall, 'degraded');
      }
    } else if (c.state === 'degraded') {
      degraded.push(c.name);
      overall = worst(overall, 'degraded');
    } else if (c.state === 'unknown') {
      overall = worst(overall, 'unknown');
    }
  }

  return { overall, components: normalised, downCritical, downOptional, degraded };
}
