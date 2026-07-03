/**
 * Coverage-gap tests for v8/dtmBatch (had no dedicated test file).
 *
 * Exercises:
 *   - happy path: computeTopicMask → buildDtmFeed pipeline
 *   - no-starve fallback: empty allowlist ⇒ ['values','lifestyle']
 *   - blocked-topic accessor: findBatchTopicsInBlocked
 *   - rejected-topic accessor: maskRejectedTopics
 *   - viewer-state contract (mood + coverage + late-night interactions)
 *
 * Cross-refs:
 *   - services/shared/src/algo/v8/dtmBatch.ts (buildMaskedDtmFeed etc.)
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.1 (algo coverage ≥ 80%)
 */

import { describe, it, expect } from 'vitest';
import {
  buildMaskedDtmFeed,
  findBatchTopicsInBlocked,
  maskRejectedTopics,
  NO_STARVE_FALLBACK,
} from '../v8/dtmBatch';
import type { DtmFeedInput, DtmTopicCandidate, DtmTopicHistory } from '../dtmFeedV7';
import type { DtmMaskInput } from '../v8/dtmTopicMask';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function candidate(
  topic: string, opts: Partial<DtmTopicCandidate> = {},
): DtmTopicCandidate {
  return {
    topic,
    importance: opts.importance ?? 0.5,
    lastAskedDaysAgo: opts.lastAskedDaysAgo ?? 7,
    tone: opts.tone ?? 'warm',
    cohortPopularity: opts.cohortPopularity,
    reciprocityLift: opts.reciprocityLift,
  };
}

function makeFeed(
  candidates: DtmTopicCandidate[],
  history: Map<string, DtmTopicHistory> = new Map(),
  weights: Map<string, number> = new Map(),
  k = 5,
): Omit<DtmFeedInput, 'topicMask'> {
  return { weights, candidates, history, k };
}

function mask(
  coverageStage: DtmMaskInput['coverageStage'],
  opts: Partial<DtmMaskInput> = {},
): DtmMaskInput {
  return {
    moodGuess: opts.moodGuess ?? 0.5,
    recentSessionFlags: opts.recentSessionFlags ?? [],
    coverageStage,
    localHour: opts.localHour ?? null,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('v8/dtmBatch — coverage gap fills', () => {
  it('NO_STARVE_FALLBACK is exactly [values, lifestyle]', () => {
    // // because: dtmBatch.ts §33 documents this as the two anchor
    // topics from EMPTY_STAGE_ALLOWED. Locking the constant so a future
    // refactor can't silently expand the fallback.
    expect(NO_STARVE_FALLBACK).toEqual(['values', 'lifestyle']);
  });

  it('happy path: sufficient coverage + neutral mood returns the full mask', () => {
    // // because: with no reason to gate, computeTopicMask returns
    // reason='no_mask' and all topics allowed; buildDtmFeed runs
    // unchanged with the entire allowlist.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({ feed, mask: mask('sufficient') });
    expect(out.mask.reason).toBe('no_mask');
    expect(out.effectiveMask.length).toBe(DTM_TOPIC_KEYS.length);
    expect(out.result.batch.length).toBeGreaterThan(0);
  });

  it('coverage_sparse: only LIGHT_TOPICS surface', () => {
    // // because: rule 2 in computeTopicMask forces the light 4 when
    // coverage is sparse — communication / values / lifestyle / leisure.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({ feed, mask: mask('sparse') });
    expect(out.mask.reason).toBe('coverage_sparse');
    for (const item of out.result.batch) {
      expect(['values', 'lifestyle', 'communication', 'leisure']).toContain(item.topic);
    }
  });

  it('coverage=empty: only [values, lifestyle] surface', () => {
    // // because: rule 1 — the tightest allowlist. The user has answered
    // zero topics; anchor them on the two lowest-cognitive-load openers.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({ feed, mask: mask('empty') });
    expect(out.effectiveMask).toEqual(['values', 'lifestyle']);
    for (const item of out.result.batch) {
      expect(['values', 'lifestyle']).toContain(item.topic);
    }
  });

  it('low mood + full coverage: heavy topics blocked', () => {
    // // because: rule at moodGuess < 0.4 removes HEAVY_TOPICS
    // (intimacy, conflict, finance).
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('full', { moodGuess: 0.2 }),
    });
    expect(out.mask.reason).toBe('low_mood');
    expect(out.mask.blockedTopics).toEqual(expect.arrayContaining(['intimacy', 'conflict', 'finance']));
    for (const item of out.result.batch) {
      expect(['intimacy', 'conflict', 'finance']).not.toContain(item.topic);
    }
  });

  it('late night + full coverage: full user is NOT gated (power-user carve-out)', () => {
    // // because: dtmTopicMask rule 3 explicitly exempts 'full' stage
    // from the late-night gate — a power-user revisiting at 1am should
    // still get the heavy topics they want.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('full', { moodGuess: 0.5, localHour: 1 }),
    });
    expect(out.mask.reason).toBe('no_mask');
  });

  it('late night + sufficient coverage: heavy topics blocked', () => {
    // // because: rule 3 fires when localHour ∈ LATE_NIGHT_HOURS AND
    // coverage is not 'full'. Sufficient coverage still qualifies for the gate.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('sufficient', { moodGuess: 0.5, localHour: 23 }),
    });
    expect(out.mask.reason).toBe('late_night');
    for (const item of out.result.batch) {
      expect(['intimacy', 'conflict', 'finance']).not.toContain(item.topic);
    }
  });

  it('window-shopping streak (2+ recent) blocks heavy topics', () => {
    // // because: rule at recentSessionFlags — two consecutive
    // window-shopping sessions triggers gating regardless of mood.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('sufficient', {
        moodGuess: 0.6,
        recentSessionFlags: [
          { windowShopping: true, ghostedSelf: false },
          { windowShopping: true, ghostedSelf: false },
        ],
      }),
    });
    expect(out.mask.reason).toBe('window_shopping_streak');
  });

  it('findBatchTopicsInBlocked: returns [] when reason is no_mask', () => {
    // // because: dtmBatch.ts:82 short-circuits — no blockedTopics means
    // nothing to intersect with.
    const feed = makeFeed([candidate('values')]);
    const out = buildMaskedDtmFeed({ feed, mask: mask('sufficient') });
    expect(findBatchTopicsInBlocked(out.result, out.mask)).toEqual([]);
  });

  it('findBatchTopicsInBlocked: identifies topics originally in the blocked set', () => {
    // // because: defensive accessor for a future caller that hand-builds
    // a TopicMaskResult. Under standard semantics blocked topics are
    // filtered pre-scoring, so under the standard path this returns [].
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('full', { moodGuess: 0.1 }),
    });
    // Under normal flow buildDtmFeed already suppresses masked topics.
    const overlap = findBatchTopicsInBlocked(out.result, out.mask);
    expect(overlap).toEqual([]);
    // But if we simulate a hand-built mask with blockedTopics that
    // *did* leak into the batch, the accessor picks it up:
    const surfacedTopic = out.result.batch[0].topic;
    const forgedMask = {
      ...out.mask,
      reason: 'low_mood' as const,
      blockedTopics: [surfacedTopic],
    };
    expect(findBatchTopicsInBlocked(out.result, forgedMask)).toContain(surfacedTopic);
  });

  it('maskRejectedTopics: returns topics rejected with reason=mood_mask', () => {
    // // because: buildDtmFeed pre-filters candidates against the mask;
    // rejected rows have reason='mood_mask'. The accessor extracts them
    // so the route can emit one telemetry event per rejection.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({
      feed,
      mask: mask('full', { moodGuess: 0.1 }),
    });
    const rejected = maskRejectedTopics(out.result);
    // Heavy topics should appear in the rejected list, because the mask
    // filtered them before scoring.
    expect(rejected).toEqual(expect.arrayContaining(['intimacy', 'conflict', 'finance']));
  });

  it('maskRejectedTopics: only counts reason=mood_mask (ignores penalty rejections)', () => {
    // // because: buildDtmFeed also rejects for saturation/skip/abandon.
    // maskRejectedTopics MUST discriminate by reason string so callers
    // don't double-count non-mask rejections.
    const history = new Map<string, DtmTopicHistory>();
    // Saturation limit is 5 — force a rejection with reason != mood_mask.
    history.set('growth', { answered: 6, skippedRecently: false, abandonedRecently: false });
    const feed = makeFeed(
      DTM_TOPIC_KEYS.map((t) => candidate(t)),
      history,
    );
    const out = buildMaskedDtmFeed({ feed, mask: mask('sufficient') });
    // 'growth' is saturated — it should be in `result.rejected` but with
    // a reason other than 'mood_mask'.
    const growthReject = out.result.rejected.find((r) => r.topic === 'growth');
    expect(growthReject).toBeDefined();
    expect(growthReject!.reason).not.toBe('mood_mask');
    // maskRejectedTopics must NOT include it.
    expect(maskRejectedTopics(out.result)).not.toContain('growth');
  });

  it('effectiveMask equals mask.allowedTopics when allowlist is non-empty', () => {
    // // because: the no-starve fallback ONLY fires when
    // allowedTopics.length === 0. In all other cases the effective mask
    // is a pass-through.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({ feed, mask: mask('sparse') });
    expect(out.effectiveMask).toEqual(out.mask.allowedTopics);
  });

  it('idempotence: same inputs → same result (pure fn contract)', () => {
    // // because: dtmBatch.ts is explicitly documented as a pure module.
    // No hidden Date.now(), no random ordering — twice = same batch.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const input = { feed, mask: mask('sufficient') };
    const a = buildMaskedDtmFeed(input);
    const b = buildMaskedDtmFeed(input);
    expect(a.result.batch.map((x) => x.topic)).toEqual(b.result.batch.map((x) => x.topic));
    expect(a.mask.reason).toEqual(b.mask.reason);
    expect(a.effectiveMask).toEqual(b.effectiveMask);
  });

  it('preserves DtmFeedResult.batch shape (topic, score, reasons)', () => {
    // // because: the route consumes .topic + .score for ordering. If a
    // future refactor drops one of these fields the whole page breaks.
    const feed = makeFeed(DTM_TOPIC_KEYS.map((t) => candidate(t)));
    const out = buildMaskedDtmFeed({ feed, mask: mask('sufficient') });
    for (const b of out.result.batch) {
      expect(typeof b.topic).toBe('string');
      expect(typeof b.score).toBe('number');
      expect(Array.isArray(b.reasons)).toBe(true);
    }
  });

  it('empty candidate pool: batch is empty and effectiveMask is still computed', () => {
    // // because: edge case where the caller passed candidates=[] — the
    // mask branch of the code should still complete (no throw) and
    // return an empty batch.
    const feed = makeFeed([]);
    const out = buildMaskedDtmFeed({ feed, mask: mask('sufficient') });
    expect(out.result.batch).toEqual([]);
    expect(out.effectiveMask.length).toBeGreaterThan(0);
  });
});
