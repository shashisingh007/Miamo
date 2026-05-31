import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTurnTaking,
  overallDtmTurnTakingShare,
} from '../dtmTopicTurnTakingBalance';

describe('dtmTopicTurnTakingBalance', () => {
  it('returns empty when no events', () => {
    expect(summarizeDtmTopicTurnTaking([])).toEqual([]);
  });

  it('ignores unknown topics', () => {
    expect(
      summarizeDtmTopicTurnTaking([{ topic: 'banana', initiator: 'self' }])
    ).toEqual([]);
  });

  it('ignores events with invalid initiator', () => {
    expect(
      summarizeDtmTopicTurnTaking([
        { topic: 'values', initiator: 'bot' as any },
      ])
    ).toEqual([]);
  });

  it('untouched topics are omitted from output', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'values', initiator: 'self' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].topic).toBe('values');
  });

  it('all-self → self_dominant', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'finance', initiator: 'self' },
      { topic: 'finance', initiator: 'self' },
      { topic: 'finance', initiator: 'self' },
    ]);
    expect(rows[0].band).toBe('self_dominant');
    expect(rows[0].selfShare).toBe(1);
    expect(rows[0].balance).toBe(0.5);
  });

  it('all-partner → partner_dominant', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'finance', initiator: 'partner' },
      { topic: 'finance', initiator: 'partner' },
    ]);
    expect(rows[0].band).toBe('partner_dominant');
    expect(rows[0].selfShare).toBe(0);
  });

  it('50/50 split → balanced', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'leisure', initiator: 'self' },
      { topic: 'leisure', initiator: 'partner' },
    ]);
    expect(rows[0].band).toBe('balanced');
    expect(rows[0].balance).toBe(0);
  });

  it('60/40 → self_leaning', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'social', initiator: 'self' },
      { topic: 'social', initiator: 'self' },
      { topic: 'social', initiator: 'self' },
      { topic: 'social', initiator: 'partner' },
      { topic: 'social', initiator: 'partner' },
    ]);
    expect(rows[0].band).toBe('self_leaning');
  });

  it('30/70 → partner_leaning', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'health', initiator: 'self' },
      { topic: 'health', initiator: 'self' },
      { topic: 'health', initiator: 'self' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
      { topic: 'health', initiator: 'partner' },
    ]);
    expect(rows[0].band).toBe('partner_leaning');
  });

  it('preserves canonical topic order', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'future', initiator: 'self' },
      { topic: 'values', initiator: 'partner' },
    ]);
    expect(rows.map((r) => r.topic)).toEqual(['values', 'future']);
  });

  it('overallDtmTurnTakingShare aggregates across topics', () => {
    const rows = summarizeDtmTopicTurnTaking([
      { topic: 'values', initiator: 'self' },
      { topic: 'values', initiator: 'self' },
      { topic: 'family', initiator: 'partner' },
      { topic: 'family', initiator: 'partner' },
    ]);
    expect(overallDtmTurnTakingShare(rows)).toBe(0.5);
  });

  it('overallDtmTurnTakingShare returns 0 for empty', () => {
    expect(overallDtmTurnTakingShare([])).toBe(0);
  });
});
