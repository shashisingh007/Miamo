import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  stageEligibility, stageRecall, stagePolicyRerank, stageSessionAdapt,
  runPipeline, type Candidate, type PipelineContext,
} from '../pipeline';
import type { SessionSummaryRow } from '../signals';

function cand(id: string, score: number, archetype?: string, ineligible = false): Candidate {
  return { id, score, archetype, ineligible };
}

function session(over: Partial<SessionSummaryRow> = {}): SessionSummaryRow {
  return {
    uidHash: 'h', sessionId: 's',
    startedAt: new Date(), endedAt: new Date(),
    durationMs: 60_000, idleMs: 0, routesVisited: [],
    cardsViewed: 5, swipesLeft: 0, swipesRight: 0,
    msgsSent: 0, msgsRead: 0,
    zeroActionSession: false, windowShopping: false, ghostedSelf: false,
    ...over,
  };
}

describe('pipeline stages', () => {
  it('S1 eligibility removes ineligible candidates', () => {
    const out = stageEligibility([
      cand('a', 80), cand('b', 90, undefined, true), cand('c', 70),
    ]);
    expect(out.map((c) => c.id)).toEqual(['a', 'c']);
  });

  it('S2 recall keeps top-K by score', () => {
    const out = stageRecall([
      cand('a', 80), cand('b', 90), cand('c', 70), cand('d', 60), cand('e', 50),
    ], 3);
    expect(out.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('S4 policy_rerank boosts when zeroActionRecovery detected', () => {
    const ctx: PipelineContext = {
      sessions: [
        session({ zeroActionSession: true }),
        session({ zeroActionSession: true }),
      ],
    };
    const out = stagePolicyRerank([cand('a', 50)], ctx);
    expect(out[0].score).toBeGreaterThan(50);
  });

  it('S5 session_adapt avoids three same-archetype cards in a row', () => {
    const out = stageSessionAdapt([
      cand('a1', 100, 'wordsmith'),
      cand('a2', 99,  'wordsmith'),
      cand('a3', 98,  'wordsmith'),
      cand('b1', 97,  'voice_first'),
      cand('a4', 96,  'wordsmith'),
    ]);
    // first 3 should not all be 'wordsmith'
    const first3 = out.slice(0, 3).map((c) => c.archetype);
    expect(first3.filter((a) => a === 'wordsmith').length).toBeLessThan(3);
  });
});

describe('runPipeline — flag gating', () => {
  const originals: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of ['S1', 'S2', 'S3', 'S4', 'S5']) {
      const key = `PIPELINE_${k}_ENABLED`;
      originals[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(originals)) {
      if (v != null) process.env[k] = v; else delete process.env[k];
    }
  });

  it('returns input unchanged when all flags off', () => {
    const cands = [cand('a', 50, undefined, true), cand('b', 40)];
    const out = runPipeline(cands, { sessions: [] });
    expect(out).toEqual(cands);
  });

  it('applies S1 only when its flag is on', () => {
    process.env.PIPELINE_S1_ENABLED = '1';
    const out = runPipeline([cand('a', 50, undefined, true), cand('b', 40)], { sessions: [] });
    expect(out.map((c) => c.id)).toEqual(['b']);
  });
});
