import { describe, it, expect } from 'vitest';
import { renderDtmPairExplain } from '../dtmPairExplainText';

describe('dtmPairExplainText', () => {
  it('empty input -> empty string', () => {
    expect(renderDtmPairExplain([])).toBe('');
  });

  it('single support', () => {
    expect(renderDtmPairExplain([{ topic: 'values', polarity: 'support' }]))
      .toBe('You align on values.');
  });

  it('two supports use "and" without serial comma', () => {
    const s = renderDtmPairExplain([
      { topic: 'values', polarity: 'support' },
      { topic: 'communication', polarity: 'support' },
    ]);
    expect(s).toBe('You align on values and communication.');
  });

  it('three supports use Oxford comma', () => {
    const s = renderDtmPairExplain([
      { topic: 'values', polarity: 'support' },
      { topic: 'communication', polarity: 'support' },
      { topic: 'growth', polarity: 'support' },
    ]);
    expect(s).toBe('You align on values, communication, and growth.');
  });

  it('mixed supports and risks produce contrastive sentence', () => {
    const s = renderDtmPairExplain([
      { topic: 'values', polarity: 'support' },
      { topic: 'growth', polarity: 'support' },
      { topic: 'family', polarity: 'risk' },
    ]);
    expect(s).toBe('You align on values and growth, though family may differ.');
  });

  it('all risks', () => {
    const s = renderDtmPairExplain([
      { topic: 'finance', polarity: 'risk' },
      { topic: 'conflict', polarity: 'risk' },
    ]);
    expect(s).toBe('You may differ on finance and conflict.');
  });

  it('preserves caller-supplied order', () => {
    const s = renderDtmPairExplain([
      { topic: 'leisure', polarity: 'support' },
      { topic: 'values', polarity: 'support' },
    ]);
    expect(s).toBe('You align on leisure and values.');
  });

  it('result has no leading/trailing whitespace', () => {
    const s = renderDtmPairExplain([{ topic: 'values', polarity: 'support' }]);
    expect(s).toBe(s.trim());
  });
});
