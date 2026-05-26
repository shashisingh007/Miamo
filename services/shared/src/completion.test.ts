import { describe, it, expect, vi } from 'vitest';
import { computeCompletionScore } from './completion';

function makePrisma(overrides: any = {}) {
  const profile = {
    userId: 'u1', age: 28, gender: 'female', city: 'Mumbai',
    profession: 'Designer', bio: 'I love long walks and good coffee — looking for someone real.',
    seriousMode: false,
    height: 165, education: 'BFA', languages: 'English,Hindi', diet: 'veg',
    ...overrides.profile,
  };
  return {
    profile: { findUnique: vi.fn().mockResolvedValue(profile) },
    profilePhoto: { count: vi.fn().mockResolvedValue(overrides.photos ?? 3) },
    profilePrompt: { count: vi.fn().mockResolvedValue(overrides.prompts ?? 3) },
    profileInterest: { count: vi.fn().mockResolvedValue(overrides.interests ?? 5) },
    user: { findUnique: vi.fn().mockResolvedValue({ verified: true }) },
  } as any;
}

describe('v3.2 completion score', () => {
  it('returns 0 for missing profile', async () => {
    const prisma = { profile: { findUnique: vi.fn().mockResolvedValue(null) } } as any;
    const r = await computeCompletionScore(prisma, 'u1');
    expect(r.score).toBe(0);
    expect(r.missing).toContain('profile');
  });

  it('a complete casual user scores >= 60 and clears casual threshold', async () => {
    const r = await computeCompletionScore(makePrisma(), 'u1');
    expect(r.score).toBeGreaterThanOrEqual(60);
    expect(r.threshold).toBe(60);
    expect(r.dtm).toBe(false);
  });

  it('a sparse user falls below threshold and lists missing fields', async () => {
    const prisma = makePrisma({
      photos: 0, prompts: 0, interests: 0,
      profile: { bio: '', city: 'Unknown', profession: 'Not set' },
    });
    const r = await computeCompletionScore(prisma, 'u1');
    expect(r.score).toBeLessThan(60);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it('DTM mode raises threshold to 80 and counts extra fields', async () => {
    const prisma = makePrisma({
      profile: { seriousMode: true, familyBackground: 'tight family', educationLevel: 'MBA', employer: 'Acme', incomeBand: '20-30L', maritalStatus: 'never-married', expectedTimeline: '1yr' },
    });
    const r = await computeCompletionScore(prisma, 'u1');
    expect(r.threshold).toBe(80);
    expect(r.dtm).toBe(true);
  });

  it('DTM user missing extra fields gets them in missing[]', async () => {
    const prisma = makePrisma({ profile: { seriousMode: true } });
    const r = await computeCompletionScore(prisma, 'u1');
    expect(r.dtm).toBe(true);
    expect(r.missing).toContain('familyBackground');
  });
});
