/**
 * Reserved v5 dispatchers — for algos that haven't gotten signal-aware
 * upgrades yet, each `*Dispatch` must produce the same numerical result as
 * the v4 path regardless of the v5 flag state. This is the contract that
 * lets us pre-ship feature flags safely.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scoreNewDispatch, scoreNewV4, type NewInputs } from '../new';
import { scoreVerifiedDispatch, scoreVerifiedV4, type VerifiedInputs } from '../verified';
import { scoreSeriousDispatch, scoreSeriousV4, type SeriousInputs } from '../serious';
import { scoreMoveDispatch, scoreMoveV4, type MoveInputs, type MoveKind } from '../moves';
import { scoreBeatDispatch, scoreBeatV4, type Beat, type BeatInputs } from '../beats';
import { pickAiMatchDispatch, pickAiMatchV4 } from '../aiMatch';
import { dtmAffinityDispatch, dtmAffinityV4 } from '../dtm';

const fyBase = {
  me: null, cand: null,
  myIntent: null, candIntent: null,
  myAge: 28, candAge: 30,
  cityKm: 10,
  myInterests: [], candInterests: [],
  pair: undefined,
  priorCount: 0,
  impressionsLast48h: 0,
  consent: 'A' as any,
};

function withFlag(envKey: string, on: boolean, fn: () => void) {
  const prev = process.env[envKey];
  if (on) process.env[envKey] = '1'; else delete process.env[envKey];
  try { fn(); } finally {
    if (prev === undefined) delete process.env[envKey];
    else process.env[envKey] = prev;
  }
}

describe('reserved v5 dispatchers — score equality with v4', () => {
  it('new: dispatcher result equals v4 with flag on or off', () => {
    const inp: NewInputs = { ...fyBase, candCreatedAtMs: Date.now(), verified: true, completeness: 0.8 };
    const expected = scoreNewV4(inp).score;
    withFlag('ALGO_V5_NEW_ENABLED', false, () => {
      expect(scoreNewDispatch(inp).score).toBe(expected);
    });
    withFlag('ALGO_V5_NEW_ENABLED', true, () => {
      expect(scoreNewDispatch(inp).score).toBe(expected);
    });
  });

  it('verified: dispatcher result equals v4', () => {
    const inp: VerifiedInputs = { ...fyBase, photoVerified: true, phoneVerified: true, idVerified: true };
    const expected = scoreVerifiedV4(inp).score;
    withFlag('ALGO_V5_VERIFIED_ENABLED', true, () => {
      expect(scoreVerifiedDispatch(inp).score).toBe(expected);
    });
  });

  it('serious: dispatcher result equals v4', () => {
    const inp: SeriousInputs = { ...fyBase, candIntent: 'serious', dtmCompletes90d: 1, lovelangCompat: 0.6, completeness: 0.8 };
    const expected = scoreSeriousV4(inp).score;
    withFlag('ALGO_V5_SERIOUS_ENABLED', true, () => {
      expect(scoreSeriousDispatch(inp).score).toBe(expected);
    });
  });

  it('dtm: dispatcher equals v4 (null inputs → null)', () => {
    withFlag('ALGO_V5_DTM_ENABLED', true, () => {
      expect(dtmAffinityDispatch(null, null)).toBe(dtmAffinityV4(null, null));
    });
  });

  it('moves: dispatcher score equals v4', () => {
    const kind: MoveKind = 'question';
    const inp: MoveInputs = {
      candFeatures: null,
      lastUsedAgoSec: {},
      candLastAction: null,
      nowHour: 14,
      deepCompatAffinity: {},
      consent: 'A' as any,
    };
    const v4 = scoreMoveV4(kind, inp);
    withFlag('ALGO_V5_MOVES_ENABLED', true, () => {
      expect(scoreMoveDispatch(kind, inp).score).toBe(v4.score);
    });
  });

  it('beats: dispatcher score equals v4', () => {
    const beat: Beat = { id: 'b1', genres: ['lofi'], bpm: 90, recentPlays: 10 };
    const inp: BeatInputs = {
      candFeatures: null,
      candPreferredGenres: ['lofi'],
      candPreferredBpm: { min: 80, max: 100 },
      ageSinceLastBeatSec: 3600,
      nowHour: 21,
    };
    const v4 = scoreBeatV4(beat, inp);
    withFlag('ALGO_V5_BEATS_ENABLED', true, () => {
      expect(scoreBeatDispatch(beat, inp).score).toBe(v4.score);
    });
  });

  it('aiMatch: dispatcher equals v4 on empty input', () => {
    withFlag('ALGO_V5_AI_MATCH_ENABLED', true, () => {
      expect(pickAiMatchDispatch([])).toEqual(pickAiMatchV4([]));
    });
  });
});
