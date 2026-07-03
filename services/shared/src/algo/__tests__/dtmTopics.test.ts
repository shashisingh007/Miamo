import { describe, it, expect } from 'vitest';
import {
  DTM_TOPIC_COUNT,
  DTM_TOPIC_KEYS,
  DTM_TOPIC_LABELS,
  dtmTopicKey,
  dtmTopicLabel,
} from '../dtmTopics';

describe('DTM topic table', () => {
  it('has exactly 16 topics', () => {
    expect(DTM_TOPIC_COUNT).toBe(16);
    expect(DTM_TOPIC_KEYS).toHaveLength(16);
  });
  it('has a label for every key', () => {
    for (const k of DTM_TOPIC_KEYS) {
      expect(DTM_TOPIC_LABELS[k]).toBeTruthy();
      expect(typeof DTM_TOPIC_LABELS[k]).toBe('string');
    }
  });
  it('keys are unique', () => {
    const set = new Set(DTM_TOPIC_KEYS);
    expect(set.size).toBe(DTM_TOPIC_KEYS.length);
  });
  it('dtmTopicKey returns the canonical key for valid indices', () => {
    expect(dtmTopicKey(0)).toBe('values');
    expect(dtmTopicKey(15)).toBe('future');
  });
  it('dtmTopicKey returns null for invalid indices', () => {
    expect(dtmTopicKey(-1)).toBeNull();
    expect(dtmTopicKey(16)).toBeNull();
    expect(dtmTopicKey(1.5)).toBeNull();
  });
  it('dtmTopicLabel mirrors the table', () => {
    expect(dtmTopicLabel(0)).toBe(DTM_TOPIC_LABELS.values);
    expect(dtmTopicLabel(99)).toBeNull();
  });
});
