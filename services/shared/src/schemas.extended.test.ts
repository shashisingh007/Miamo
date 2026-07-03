import { describe, it, expect } from 'vitest';
import {
  chatThemeBodySchema,
  chatPinBodySchema,
  messageEditBodySchema,
  beatStartBodySchema,
  beatCompleteBodySchema,
  settingsUpdateBodySchema,
  privacyUpdateBodySchema,
  passFeedbackBodySchema,
  discoverMoveBodySchema,
  matchActionBodySchema,
  discoverFiltersBodySchema,
} from './schemas';

describe('chatThemeBodySchema', () => {
  it('accepts theme only', () => {
    expect(chatThemeBodySchema.parse({ theme: 'dusk' }).theme).toBe('dusk');
  });
  it('accepts background only', () => {
    expect(chatThemeBodySchema.parse({ background: '#fff' }).background).toBe('#fff');
  });
  it('rejects empty body (neither field present)', () => {
    expect(() => chatThemeBodySchema.parse({})).toThrow();
  });
});

describe('chatPinBodySchema', () => {
  it('accepts {pinned:true}', () => {
    expect(chatPinBodySchema.parse({ pinned: true }).pinned).toBe(true);
  });
  it('rejects non-boolean pinned', () => {
    expect(() => chatPinBodySchema.parse({ pinned: 'yes' })).toThrow();
  });
  it('accepts empty body (toggle defaults to true server-side)', () => {
    expect(chatPinBodySchema.parse({})).toEqual({});
  });
});

describe('messageEditBodySchema', () => {
  it('rejects empty content', () => {
    expect(() => messageEditBodySchema.parse({ content: '' })).toThrow();
  });
  it('rejects > 5000 chars', () => {
    expect(() => messageEditBodySchema.parse({ content: 'x'.repeat(5001) })).toThrow();
  });
  it('trims content', () => {
    expect(messageEditBodySchema.parse({ content: '  hi  ' }).content).toBe('hi');
  });
});

describe('beatStartBodySchema', () => {
  it('requires matchedUserId', () => {
    expect(() => beatStartBodySchema.parse({})).toThrow();
  });
});

describe('beatCompleteBodySchema', () => {
  it('rejects unknown type', () => {
    expect(() => beatCompleteBodySchema.parse({ type: 'lasers' })).toThrow();
  });
  it('accepts known type', () => {
    expect(beatCompleteBodySchema.parse({ type: 'snap' }).type).toBe('snap');
  });
});

describe('settingsUpdateBodySchema', () => {
  it('accepts a typed boolean toggle', () => {
    expect(settingsUpdateBodySchema.parse({ readReceipts: false }).readReceipts).toBe(false);
  });
  it('rejects non-boolean readReceipts', () => {
    expect(() => settingsUpdateBodySchema.parse({ readReceipts: 'yes' })).toThrow();
  });
  it('accepts nested notifications object', () => {
    const out = settingsUpdateBodySchema.parse({ notifications: { matches: true, stories: false } });
    expect(out.notifications?.matches).toBe(true);
  });
});

describe('privacyUpdateBodySchema', () => {
  it('accepts frontend alias keys', () => {
    expect(privacyUpdateBodySchema.parse({ searchByCity: true }).searchByCity).toBe(true);
  });
  it('rejects non-boolean field', () => {
    expect(() => privacyUpdateBodySchema.parse({ profileVisible: 'public' })).toThrow();
  });
});

describe('passFeedbackBodySchema', () => {
  it('requires userId and reason', () => {
    expect(() => passFeedbackBodySchema.parse({ reason: 'bored' })).toThrow();
    expect(() => passFeedbackBodySchema.parse({ userId: 'u1' })).toThrow();
  });
  it('accepts a complete payload', () => {
    const out = passFeedbackBodySchema.parse({ userId: 'u1', reason: 'photos', details: 'blurry' });
    expect(out).toEqual({ userId: 'u1', reason: 'photos', details: 'blurry' });
  });
});

describe('discoverMoveBodySchema', () => {
  it('requires toUserId', () => {
    expect(() => discoverMoveBodySchema.parse({})).toThrow();
  });
});

describe('matchActionBodySchema', () => {
  it('accepts empty body (legacy clients sent {})', () => {
    expect(matchActionBodySchema.parse({})).toEqual({});
  });
  it('rejects > 200 char reason', () => {
    expect(() => matchActionBodySchema.parse({ reason: 'x'.repeat(201) })).toThrow();
  });
});

describe('discoverFiltersBodySchema', () => {
  it('coerces nothing (numbers required as numbers)', () => {
    expect(() => discoverFiltersBodySchema.parse({ minAge: '18' })).toThrow();
  });
  it('rejects out-of-range minAge', () => {
    expect(() => discoverFiltersBodySchema.parse({ minAge: 5 })).toThrow();
  });
  it('passes through unknown keys (server still whitelists)', () => {
    const out = discoverFiltersBodySchema.parse({ minAge: 25, maxAge: 40, customExtra: 'x' });
    expect(out.minAge).toBe(25);
    expect((out as any).customExtra).toBe('x');
  });
});
