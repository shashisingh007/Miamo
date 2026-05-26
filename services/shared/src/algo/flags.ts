/**
 * Surface-level v4 enable flags.
 *
 * Each surface (discover / messaging / beats / notifications / search /
 * feed / aiMatch) reads `ALGO_V4_RANK_ENABLED_<surface>` independently so we
 * can ramp the rollout one surface at a time. Default off (legacy path).
 *
 * Usage in a service:
 *   import { v4RankEnabled } from '@miamo/shared/algo/flags';
 *   if (v4RankEnabled('discover')) { use new rankForYou } else { legacy }
 */
export type V4Surface = 'discover' | 'messaging' | 'beats' | 'notifications' | 'search' | 'feed' | 'aiMatch' | 'deepCompat';

export function v4RankEnabled(surface: V4Surface): boolean {
  const key = `ALGO_V4_RANK_ENABLED_${surface.toUpperCase()}`;
  return process.env[key] === '1';
}

export function v4WorkersEnabled(): boolean {
  return process.env.ALGO_V4_WORKERS_ENABLED === '1';
}

/** For dashboards / debug endpoints. */
export function v4FlagSnapshot(): Record<string, boolean> {
  const surfaces: V4Surface[] = ['discover', 'messaging', 'beats', 'notifications', 'search', 'feed', 'aiMatch', 'deepCompat'];
  const out: Record<string, boolean> = { workers: v4WorkersEnabled() };
  for (const s of surfaces) out[s] = v4RankEnabled(s);
  return out;
}
