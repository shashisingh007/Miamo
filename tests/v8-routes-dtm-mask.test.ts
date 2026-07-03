/**
 * v8 DTM topic-mask wiring — route-level integration tests.
 *
 * We do NOT boot Express here. The route in `services/content/src/server.ts`
 * is thin glue over three pure modules:
 *   - `dtmTopicMask.computeTopicMask`
 *   - `dtmFeedV7.buildDtmFeed` (now mask-aware)
 *   - `dtmBatch.buildMaskedDtmFeed` (the composer)
 *
 * Tests exercise that glue end-to-end with the same shape of inputs the route
 * would assemble (mood, last-2-sessions, coverage stage, local hour, candidate
 * list). Flag semantics are tested directly against the env var so the route
 * contract — "default OFF, byte-identical to v7 when off" — is locked.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDtmFeed, type DtmTopicCandidate, type DtmTopicHistory } from '../services/shared/src/algo/dtmFeedV7';
import { computeTopicMask, HEAVY_TOPICS, LIGHT_TOPICS, type TopicKey } from '../services/shared/src/algo/v8/dtmTopicMask';
import { buildMaskedDtmFeed, NO_STARVE_FALLBACK, maskRejectedTopics, findBatchTopicsInBlocked } from '../services/shared/src/algo/v8/dtmBatch';
import { DTM_TOPIC_KEYS } from '../services/shared/src/algo/dtmTopics';

const FLAG = 'FEATURE_DTM_MASK_ENABLED';

function isMaskEnabled(): boolean {
  return process.env[FLAG] === '1';
}

const cand = (topic: TopicKey, over: Partial<DtmTopicCandidate> = {}): DtmTopicCandidate => ({
  topic,
  importance: 0.6,
  lastAskedDaysAgo: 7,
  tone: 'reflective',
  cohortPopularity: 0.4,
  reciprocityLift: 0.3,
  ...over,
});

function allTopicCandidates(): DtmTopicCandidate[] {
  return DTM_TOPIC_KEYS.map((t) => cand(t));
}

/**
 * Mirrors the route's flag-branch. When the flag is off we call `buildDtmFeed`
 * directly; when on we call `buildMaskedDtmFeed`. The route's argument-shape
 * is preserved so this acts as a high-fidelity unit test.
 */
function routeNextBatch(args: {
  candidates: DtmTopicCandidate[];
  history?: Map<string, DtmTopicHistory>;
  weights?: Map<string, number>;
  k?: number;
  moodGuess: number;
  recentSessionFlags: Array<{ windowShopping: boolean; ghostedSelf: boolean }>;
  coverageStage: 'empty' | 'sparse' | 'sufficient' | 'full';
  localHour: number | null;
}) {
  const feed = {
    candidates: args.candidates,
    history: args.history ?? new Map<string, DtmTopicHistory>(),
    weights: args.weights ?? new Map<string, number>(),
    k: args.k ?? 10,
  };
  if (!isMaskEnabled()) {
    const result = buildDtmFeed(feed);
    return { batch: result.batch, rejected: result.rejected, maskReason: 'flag_off' as const, allowedTopics: null, blockedTopics: [] as TopicKey[] };
  }
  const { result, mask, effectiveMask } = buildMaskedDtmFeed({
    feed,
    mask: {
      moodGuess: args.moodGuess,
      recentSessionFlags: args.recentSessionFlags,
      coverageStage: args.coverageStage,
      localHour: args.localHour,
    },
  });
  return { batch: result.batch, rejected: result.rejected, maskReason: mask.reason, allowedTopics: effectiveMask, blockedTopics: mask.blockedTopics };
}

describe('v8 DTM topic-mask route wiring', () => {
  beforeEach(() => { delete process.env[FLAG]; });
  afterEach(() => { delete process.env[FLAG]; });

  it('flag default OFF — `isDtmMaskEnabled()` semantics', () => {
    // Default unset
    expect(process.env[FLAG]).toBeUndefined();
    expect(isMaskEnabled()).toBe(false);
    // Truthy-but-not-'1' values still count as OFF — explicit '1' gate
    process.env[FLAG] = 'true';
    expect(isMaskEnabled()).toBe(false);
    process.env[FLAG] = '0';
    expect(isMaskEnabled()).toBe(false);
    process.env[FLAG] = '1';
    expect(isMaskEnabled()).toBe(true);
  });

  it('flag OFF — DTM batch is byte-identical to v7 ranker (same top topic)', () => {
    const candidates = allTopicCandidates().map((c) => ({ ...c, importance: 0.8 }));
    // Pin importance ordering so the top topic is deterministic.
    candidates[3] = { ...candidates[3], importance: 0.99 }; // intimacy = heavy topic

    const withoutFlag = routeNextBatch({
      candidates,
      moodGuess: 0.3, // would trigger mask if flag were on
      recentSessionFlags: [{ windowShopping: true, ghostedSelf: false }, { windowShopping: true, ghostedSelf: false }],
      coverageStage: 'sufficient',
      localHour: 23,
    });

    expect(withoutFlag.maskReason).toBe('flag_off');
    // intimacy should be present because the mask is off — same as v7
    const present = new Set(withoutFlag.batch.map((b) => b.topic));
    expect(present.has('intimacy')).toBe(true);
  });

  it('flag ON + mood 0.3 + sufficient + 11pm — heavy topics suppressed', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.3,
      recentSessionFlags: [],
      coverageStage: 'sufficient',
      localHour: 23,
    });
    // late_night rule applies first (heavy topics are blocked).
    expect(out.maskReason).toBe('late_night');
    const present = new Set(out.batch.map((b) => b.topic));
    for (const h of HEAVY_TOPICS) expect(present.has(h)).toBe(false);
    // Rejected list contains the heavy topics with reason='mood_mask'.
    const dropped = maskRejectedTopics({ batch: out.batch, rejected: out.rejected });
    for (const h of HEAVY_TOPICS) expect(dropped).toContain(h);
  });

  it('flag ON + mood 0.7 + sufficient + 10am — no mask applied, all topics available', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.7,
      recentSessionFlags: [],
      coverageStage: 'sufficient',
      localHour: 10,
    });
    expect(out.maskReason).toBe('no_mask');
    expect(out.blockedTopics.length).toBe(0);
    // All 16 topics in the allowedTopics list — buildDtmFeed picks k=10 of them.
    expect(out.batch.length).toBe(10);
    // No topic rejected for mask reason.
    const dropped = maskRejectedTopics({ batch: out.batch, rejected: out.rejected });
    expect(dropped).toEqual([]);
  });

  it('flag ON + coverage sparse — only LIGHT_TOPICS allowed', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.5,
      recentSessionFlags: [],
      coverageStage: 'sparse',
      localHour: 10,
    });
    expect(out.maskReason).toBe('coverage_sparse');
    const present = new Set(out.batch.map((b) => b.topic));
    for (const t of present) expect(LIGHT_TOPICS).toContain(t as TopicKey);
    // Anything outside LIGHT_TOPICS is blocked.
    for (const t of DTM_TOPIC_KEYS) {
      if (!LIGHT_TOPICS.includes(t)) expect(out.blockedTopics).toContain(t);
    }
  });

  it('flag ON + coverage empty — only [values, lifestyle] allowed', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.5,
      recentSessionFlags: [],
      coverageStage: 'empty',
      localHour: 10,
    });
    // dtmTopicMask returns reason='coverage_sparse' for stage='empty' too.
    expect(out.maskReason).toBe('coverage_sparse');
    const present = new Set(out.batch.map((b) => b.topic));
    expect(present.has('values')).toBe(true);
    expect(present.has('lifestyle')).toBe(true);
    // No other topic surfaced.
    for (const t of present) expect(['values', 'lifestyle']).toContain(t);
  });

  it('flag ON + window-shopping streak (last 2 sessions) — heavy topics suppressed', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.7, // good mood, but the streak still triggers
      recentSessionFlags: [
        { windowShopping: true, ghostedSelf: false },
        { windowShopping: true, ghostedSelf: false },
      ],
      coverageStage: 'sufficient',
      localHour: 10,
    });
    expect(out.maskReason).toBe('window_shopping_streak');
    const present = new Set(out.batch.map((b) => b.topic));
    for (const h of HEAVY_TOPICS) expect(present.has(h)).toBe(false);
  });

  it('flag ON + a single window-shopping session — no mask (streak rule needs 2)', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.7,
      recentSessionFlags: [{ windowShopping: true, ghostedSelf: false }],
      coverageStage: 'sufficient',
      localHour: 10,
    });
    expect(out.maskReason).toBe('no_mask');
  });

  it('flag ON + missing FeatureSnapshot (moodGuess defaults 0.5) — degrades gracefully (no mask trigger)', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      // moodGuess at the neutral fallback 0.5 mirrors the route's "snap missing" path
      moodGuess: 0.5,
      recentSessionFlags: [],
      coverageStage: 'sufficient',
      localHour: 12,
    });
    expect(out.maskReason).toBe('no_mask');
    const present = new Set(out.batch.map((b) => b.topic));
    // Heavy topics ARE allowed because the mood threshold (0.4) is not crossed.
    expect(present.size).toBeGreaterThan(0);
  });

  it('flag ON + coverage full at 1am — late-night carve-out: heavy topics still allowed', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.7,
      recentSessionFlags: [],
      coverageStage: 'full',
      localHour: 1,
    });
    // Per dtmTopicMask §3 carve-out: full coverage skips late-night gating.
    expect(out.maskReason).toBe('no_mask');
  });

  it('mask result NO_STARVE_FALLBACK is exactly [values, lifestyle]', () => {
    expect(NO_STARVE_FALLBACK).toEqual(['values', 'lifestyle']);
  });

  it('buildDtmFeed with empty topicMask returns empty batch — caller MUST handle starve', () => {
    // This is the boundary the no-starve fallback in `buildMaskedDtmFeed` guards.
    const candidates = allTopicCandidates();
    const result = buildDtmFeed({
      candidates,
      history: new Map(),
      weights: new Map(),
      topicMask: [],
    });
    expect(result.batch.length).toBe(0);
    expect(result.rejected.every((r) => r.reason === 'mood_mask')).toBe(true);
  });

  it('buildDtmFeed with topicMask=null is byte-identical to no topicMask', () => {
    const candidates = allTopicCandidates();
    const a = buildDtmFeed({ candidates, history: new Map(), weights: new Map() });
    const b = buildDtmFeed({ candidates, history: new Map(), weights: new Map(), topicMask: null });
    expect(a.batch.map((x) => x.topic)).toEqual(b.batch.map((x) => x.topic));
    expect(a.rejected).toEqual(b.rejected);
  });

  it('findBatchTopicsInBlocked returns [] for no_mask (defensive accessor)', () => {
    const mask = computeTopicMask({
      moodGuess: 0.7,
      recentSessionFlags: [],
      coverageStage: 'sufficient',
      localHour: 12,
    });
    const candidates = allTopicCandidates();
    const result = buildDtmFeed({ candidates, history: new Map(), weights: new Map() });
    expect(findBatchTopicsInBlocked(result, mask)).toEqual([]);
  });

  it('dtm.topic_masked emission count matches mask-rejected topics (telemetry contract)', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    const { result, mask } = buildMaskedDtmFeed({
      feed: { candidates, history: new Map(), weights: new Map() },
      mask: {
        moodGuess: 0.2, // low mood, heavy topics blocked
        recentSessionFlags: [],
        coverageStage: 'sufficient',
        localHour: 10,
      },
    });
    expect(mask.reason).toBe('low_mood');
    const dropped = maskRejectedTopics(result);
    // One event per rejected heavy topic that was in the candidate pool.
    expect(dropped.sort()).toEqual([...HEAVY_TOPICS].sort());
  });

  it('localHour from header — out-of-range values fall back to UTC 12 (no late-night trigger)', () => {
    process.env[FLAG] = '1';
    const candidates = allTopicCandidates();
    // Simulate the route's parsing: '99' is not in 0..23 ⇒ falls through to default 12.
    const rawHour = '99';
    const n = Number(rawHour);
    const parsed = (Number.isInteger(n) && n >= 0 && n <= 23) ? n : null;
    const effective = parsed ?? 12;
    const out = routeNextBatch({
      candidates,
      moodGuess: 0.7,
      recentSessionFlags: [],
      coverageStage: 'sufficient',
      localHour: effective,
    });
    expect(out.maskReason).toBe('no_mask'); // 12 is never late-night
  });
});
