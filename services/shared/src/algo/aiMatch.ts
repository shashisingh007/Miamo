/**
 * v4 AI Match — a once-per-day curated 1:1 pick, computed by a worker job.
 *
 * Same shape as aiPicks but uses a higher quality bar: caller filters to
 * mutual-intent + verified + minScore≥70 before invoking.
 *
 * Returns the top-1 with explain. The worker writes this to a DailyMatch
 * row (service-owned table) the UI reads each morning.
 */
import { scoreAiPicksV4, type AiPicksInputs } from './aiPicks';
import { registerAlgo } from './registry';
import { v5FeatureEnabled } from './flags';

export function pickAiMatch(cands: Array<AiPicksInputs & { candId: string }>): { candId: string; score: number; explain: ReturnType<typeof scoreAiPicksV4>['explain'] } | null {
  let best: { candId: string; score: number; explain: ReturnType<typeof scoreAiPicksV4>['explain'] } | null = null;
  for (const c of cands) {
    const { score, explain } = scoreAiPicksV4({ ...c, rand: () => 1 }); // no explore noise for the daily pick
    if (score < 70) continue;
    if (!best || score > best.score) best = { candId: c.candId, score, explain };
  }
  return best;
}

/** v5 reserved — identical to v4 today. */
export const pickAiMatchV4 = pickAiMatch;
export const pickAiMatchV5 = pickAiMatch;
export function pickAiMatchDispatch(cands: Array<AiPicksInputs & { candId: string }>) {
  return v5FeatureEnabled('aiMatch') ? pickAiMatchV5(cands) : pickAiMatchV4(cands);
}

registerAlgo({
  name: 'aiMatch',
  surface: 'aiMatch',
  usesEvents: ['discover.swipe', 'discover.match', 'msg.send', 'profile.view', 'dtm.complete'],
  weights: { ensemble: 1 },
});
