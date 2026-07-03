/**
 * v3.6.0 Settings consent toggles — schema acceptance & whitelist.
 */
import { describe, it, expect } from 'vitest';
import { settingsUpdateBodySchema, settingsConsentToggles } from '../services/shared/src/schemas';

describe('v3.6.0 settings consent toggles', () => {
  it('settingsUpdateBodySchema accepts all 4 new boolean fields', () => {
    const parsed = settingsUpdateBodySchema.safeParse({
      moodInferenceEnabled: true,
      behavioralRankingEnabled: false,
      crossUserInferenceEnabled: true,
      algorithmicTransparency: false,
    });
    expect(parsed.success).toBe(true);
  });

  it('settingsUpdateBodySchema is unchanged for legacy callers (byte-identical contract)', () => {
    const parsed = settingsUpdateBodySchema.safeParse({ theme: 'dark', notificationsEnabled: true });
    expect(parsed.success).toBe(true);
  });

  it('rejects non-boolean values for new consent fields', () => {
    const parsed = settingsUpdateBodySchema.safeParse({ moodInferenceEnabled: 'yes' });
    expect(parsed.success).toBe(false);
  });

  it('settingsConsentToggles is a standalone schema for the 4 fields', () => {
    expect(settingsConsentToggles.safeParse({ moodInferenceEnabled: true }).success).toBe(true);
    expect(settingsConsentToggles.safeParse({}).success).toBe(true); // all optional
  });
});
