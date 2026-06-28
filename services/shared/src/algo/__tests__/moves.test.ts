import { describe, it, expect } from 'vitest';
import { scoreMove, suggestMoves } from '../moves';
import type { FeatureRow } from '../signals';

function f(over: Partial<FeatureRow> = {}): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: null, deadClickRate: null, swipeRightRatio: null,
    replyPersonaP50Ms: null, responseRate: null,
    interestVec: null, vibeEmb: null, behaviorEmb: null, peakHours: null,
    ...over,
  };
}

describe('moves ranker', () => {
  it('reader prefers question', () => {
    const top = suggestMoves({
      candFeatures: f({ attentionProfile: 'reader' }),
      lastUsedAgoSec: {},
      candLastAction: null,
      nowHour: 20,
      deepCompatAffinity: {},
      consent: 'full',
    }, 1);
    expect(['question', 'date_plan', 'custom_prompt']).toContain(top[0].kind);
  });

  it('voice-first prefers voice_note', () => {
    const top = suggestMoves({
      candFeatures: f({ attentionProfile: 'voice-first', chronotype: 'evening' }),
      lastUsedAgoSec: {},
      candLastAction: null,
      nowHour: 20,
      deepCompatAffinity: {},
      consent: 'full',
    }, 2);
    expect(top.map(t => t.kind)).toContain('voice_note');
  });

  it('recent same-kind reduces notRepeating', () => {
    const recent = scoreMove('question', {
      candFeatures: f({ attentionProfile: 'reader' }),
      lastUsedAgoSec: { question: 60 }, // just used a minute ago
      candLastAction: null,
      nowHour: 20,
      deepCompatAffinity: {},
      consent: 'full',
    });
    const stale = scoreMove('question', {
      candFeatures: f({ attentionProfile: 'reader' }),
      lastUsedAgoSec: { question: 5 * 24 * 3600 }, // 5 days ago
      candLastAction: null,
      nowHour: 20,
      deepCompatAffinity: {},
      consent: 'full',
    });
    expect(stale.score).toBeGreaterThan(recent.score);
  });

  it('candidate sent voice → voice_note ranks higher', () => {
    const top = suggestMoves({
      candFeatures: f({ attentionProfile: 'visual' }), // visual would normally not prefer voice
      lastUsedAgoSec: {},
      candLastAction: { kind: 'sent_voice', sec: 60 },
      nowHour: 20,
      deepCompatAffinity: {},
      consent: 'full',
    }, 8);
    const ranks = Object.fromEntries(top.map((m, i) => [m.kind, i]));
    expect(ranks.voice_note).toBeLessThanOrEqual(3); // top half
  });

  it('explain breakdown surfaces five signals', () => {
    const m = scoreMove('compliment', {
      candFeatures: f(),
      lastUsedAgoSec: {},
      candLastAction: null,
      nowHour: 9,
      deepCompatAffinity: { compliment: 0.8 },
      consent: 'full',
    });
    expect(Object.keys(m.why).sort()).toEqual(
      ['candidateLastAction', 'deepCompatTopic', 'notRepeating', 'pairAffinity', 'timeOfDayFit'].sort(),
    );
  });
});
