import { describe, it, expect } from 'vitest';
import {
  computeTopicMask,
  HEAVY_TOPICS,
  LIGHT_TOPICS,
  MOOD_GATE_THRESHOLD,
  LATE_NIGHT_HOURS,
  type DtmMaskInput,
  type TopicKey,
} from '../v8/dtmTopicMask';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

function baseInput(overrides: Partial<DtmMaskInput> = {}): DtmMaskInput {
  return {
    moodGuess: 0.7,
    recentSessionFlags: [],
    coverageStage: 'sufficient',
    localHour: 15,
    ...overrides,
  };
}

describe('dtmTopicMask — coverage rules', () => {
  it('empty coverage allows only values + lifestyle', () => {
    const r = computeTopicMask(baseInput({ coverageStage: 'empty' }));
    expect(r.allowedTopics).toEqual(['values', 'lifestyle']);
    expect(r.reason).toBe('coverage_sparse');
    // Every other canonical topic must be blocked.
    expect(r.blockedTopics).toHaveLength(DTM_TOPIC_KEYS.length - 2);
    for (const t of DTM_TOPIC_KEYS) {
      if (t === 'values' || t === 'lifestyle') continue;
      expect(r.blockedTopics).toContain(t);
    }
  });

  it('sparse coverage allows only LIGHT_TOPICS', () => {
    const r = computeTopicMask(baseInput({ coverageStage: 'sparse' }));
    expect(new Set(r.allowedTopics)).toEqual(new Set(LIGHT_TOPICS));
    expect(r.reason).toBe('coverage_sparse');
    for (const heavy of HEAVY_TOPICS) {
      expect(r.blockedTopics).toContain(heavy);
    }
  });

  it('sparse coverage with low mood still allows LIGHT_TOPICS (coverage wins)', () => {
    // First-match priority: coverage rule fires before mood rule.
    const r = computeTopicMask(baseInput({ coverageStage: 'sparse', moodGuess: 0.1 }));
    expect(new Set(r.allowedTopics)).toEqual(new Set(LIGHT_TOPICS));
    expect(r.reason).toBe('coverage_sparse');
  });
});

describe('dtmTopicMask — late-night rule', () => {
  it('11pm + sufficient + decent mood blocks HEAVY_TOPICS with late_night reason', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'sufficient',
      localHour: 23,
      moodGuess: 0.5,
    }));
    expect(r.reason).toBe('late_night');
    for (const heavy of HEAVY_TOPICS) expect(r.blockedTopics).toContain(heavy);
    for (const heavy of HEAVY_TOPICS) expect(r.allowedTopics).not.toContain(heavy);
    // Light + neutral topics survive.
    expect(r.allowedTopics).toContain('values');
    expect(r.allowedTopics).toContain('lifestyle');
  });

  it('2am late-night + sufficient blocks heavy', () => {
    const r = computeTopicMask(baseInput({ coverageStage: 'sufficient', localHour: 2 }));
    expect(r.reason).toBe('late_night');
    for (const h of HEAVY_TOPICS) expect(r.allowedTopics).not.toContain(h);
  });

  it('5am is not late-night (boundary check)', () => {
    expect(LATE_NIGHT_HOURS.has(5)).toBe(false);
    const r = computeTopicMask(baseInput({ coverageStage: 'sufficient', localHour: 5 }));
    expect(r.reason).toBe('no_mask');
  });

  it('full coverage at 11pm bypasses the late-night gate', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'full',
      localHour: 23,
      moodGuess: 0.6,
    }));
    expect(r.reason).toBe('no_mask');
    expect(r.allowedTopics).toEqual([...DTM_TOPIC_KEYS]);
  });

  it('null localHour skips the late-night rule', () => {
    const r = computeTopicMask(baseInput({ coverageStage: 'sufficient', localHour: null }));
    expect(r.reason).toBe('no_mask');
  });
});

describe('dtmTopicMask — mood rule', () => {
  it('mood 0.3 + sufficient blocks heavy with low_mood reason', () => {
    const r = computeTopicMask(baseInput({
      moodGuess: 0.3,
      coverageStage: 'sufficient',
      localHour: 15, // daytime
    }));
    expect(r.reason).toBe('low_mood');
    for (const h of HEAVY_TOPICS) expect(r.blockedTopics).toContain(h);
  });

  it('mood exactly at threshold (0.4) does NOT trigger low_mood', () => {
    expect(MOOD_GATE_THRESHOLD).toBe(0.4);
    const r = computeTopicMask(baseInput({
      moodGuess: MOOD_GATE_THRESHOLD,
      coverageStage: 'sufficient',
      localHour: 15,
    }));
    expect(r.reason).toBe('no_mask');
  });

  it('mood just below threshold (0.399) triggers low_mood', () => {
    const r = computeTopicMask(baseInput({
      moodGuess: 0.399,
      coverageStage: 'sufficient',
      localHour: 15,
    }));
    expect(r.reason).toBe('low_mood');
  });
});

describe('dtmTopicMask — window-shopping rule', () => {
  it('2 consecutive windowShopping sessions blocks heavy', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'sufficient',
      moodGuess: 0.7,
      localHour: 15,
      recentSessionFlags: [
        { windowShopping: true, ghostedSelf: false },
        { windowShopping: true, ghostedSelf: false },
      ],
    }));
    expect(r.reason).toBe('window_shopping_streak');
    for (const h of HEAVY_TOPICS) expect(r.blockedTopics).toContain(h);
  });

  it('only 1 windowShopping session is normal (no mask)', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'sufficient',
      moodGuess: 0.7,
      localHour: 15,
      recentSessionFlags: [
        { windowShopping: true, ghostedSelf: false },
        { windowShopping: false, ghostedSelf: false },
      ],
    }));
    expect(r.reason).toBe('no_mask');
  });

  it('3+ windowShopping sessions also trigger (only first 2 inspected)', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'sufficient',
      moodGuess: 0.7,
      localHour: 15,
      recentSessionFlags: [
        { windowShopping: true, ghostedSelf: false },
        { windowShopping: true, ghostedSelf: false },
        { windowShopping: false, ghostedSelf: false },
      ],
    }));
    expect(r.reason).toBe('window_shopping_streak');
  });
});

describe('dtmTopicMask — no_mask path', () => {
  it('full coverage + good mood + daytime + no ws-streak allows all 16', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'full',
      moodGuess: 0.8,
      localHour: 23, // even at 11pm — full coverage bypasses late-night
      recentSessionFlags: [],
    }));
    expect(r.reason).toBe('no_mask');
    expect(r.allowedTopics).toEqual([...DTM_TOPIC_KEYS]);
    expect(r.blockedTopics).toEqual([]);
  });

  it('sufficient + good mood + daytime allows all 16', () => {
    const r = computeTopicMask(baseInput({
      coverageStage: 'sufficient',
      moodGuess: 0.6,
      localHour: 14,
    }));
    expect(r.reason).toBe('no_mask');
    expect(r.allowedTopics.length).toBe(DTM_TOPIC_KEYS.length);
  });
});

describe('dtmTopicMask — invariants', () => {
  it('allowed + blocked partition the 16 topics with no duplicates', () => {
    const inputs: DtmMaskInput[] = [
      baseInput({ coverageStage: 'empty' }),
      baseInput({ coverageStage: 'sparse' }),
      baseInput({ coverageStage: 'sufficient', localHour: 23 }),
      baseInput({ coverageStage: 'sufficient', moodGuess: 0.2 }),
      baseInput({
        coverageStage: 'sufficient',
        recentSessionFlags: [
          { windowShopping: true, ghostedSelf: false },
          { windowShopping: true, ghostedSelf: false },
        ],
      }),
      baseInput({ coverageStage: 'full' }),
    ];
    for (const inp of inputs) {
      const r = computeTopicMask(inp);
      const union = new Set<TopicKey>([...r.allowedTopics, ...r.blockedTopics]);
      // No duplicates within each list.
      expect(new Set(r.allowedTopics).size).toBe(r.allowedTopics.length);
      expect(new Set(r.blockedTopics).size).toBe(r.blockedTopics.length);
      // Combined cover every canonical topic exactly once.
      expect(union.size).toBe(DTM_TOPIC_KEYS.length);
      expect(r.allowedTopics.length + r.blockedTopics.length).toBe(DTM_TOPIC_KEYS.length);
      // Allowed is a subset of canonical keys.
      for (const t of r.allowedTopics) expect(DTM_TOPIC_KEYS).toContain(t);
    }
  });

  it('determinism: same input → same result twice', () => {
    const inp = baseInput({ coverageStage: 'sufficient', moodGuess: 0.2 });
    const a = computeTopicMask(inp);
    const b = computeTopicMask(inp);
    expect(a).toEqual(b);
  });
});
