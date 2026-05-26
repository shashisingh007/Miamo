import { describe, it, expect, vi } from 'vitest';
import { computeCompletionScore, CASUAL_THRESHOLD, DTM_THRESHOLD } from './completion';

function makeCasualPrisma(overrides: any = {}) {
  const profile = {
    userId: 'u1', seriousMode: false,
    age: 28, gender: 'female', city: 'Mumbai', profession: 'Designer',
    bio: 'I love long walks, strong coffee, and people who are honest about who they are. Looking for a real connection.',
    height: 165, education: 'BFA', languages: 'English,Hindi', diet: 'veg',
    drinking: 'socially', smoking: 'never', exercise: 'often', religion: 'spiritual', pets: 'dogs', children: 'open',
    lookingFor: 'long-term',
    ...overrides.profile,
  };
  return {
    profile: {
      findUnique: vi.fn().mockImplementation(({ select }: any) => {
        if (select?.seriousMode) return Promise.resolve({ seriousMode: profile.seriousMode });
        return Promise.resolve(profile);
      }),
    },
    profilePhoto: { count: vi.fn().mockResolvedValue(overrides.photos ?? 5) },
    profilePrompt: { count: vi.fn().mockResolvedValue(overrides.prompts ?? 3) },
    profileInterest: { count: vi.fn().mockResolvedValue(overrides.interests ?? 6) },
    user: { findUnique: vi.fn().mockResolvedValue({ verified: true }) },
    matrimonialProfile: { findUnique: vi.fn().mockResolvedValue(null) },
  } as any;
}

function makeDtmPrisma(overrides: any = {}) {
  const profile = {
    userId: 'u1', seriousMode: true,
    age: 28, gender: 'female', city: 'Bengaluru', profession: 'Engineer',
    ...overrides.profile,
  };
  const mp = {
    userId: 'u1',
    fullName: 'Asha',
    dateOfBirth: new Date('1996-02-01'),
    height: "5'5\"", motherTongue: 'Tamil',
    maritalStatus: 'Never Married',
    religion: 'Hindu', caste: 'Iyer', manglik: 'No',
    education: "Master's", educationDetail: 'CS', college: 'IIT Madras',
    occupation: 'Software Engineer', company: 'Acme Corp', annualIncome: '25-35L', workingCity: 'Bengaluru',
    fatherOccupation: 'Doctor', familyType: 'Nuclear', familyValues: 'Moderate', brothers: 1, sisters: 0,
    aboutMe: "I'm a software engineer who loves trekking, classical music, and long Sunday brunches with friends and family. I value honesty, ambition, and a good sense of humor in a partner. Looking for someone kind and curious.",
    aboutFamily: 'We are a close-knit family of four. Father is a doctor, mother homemaker, one younger brother in college.',
    partnerAgeMin: 27, partnerAgeMax: 34,
    partnerReligion: 'Hindu', partnerCaste: 'Open', partnerEducation: "Bachelor's+", partnerOccupation: 'Any',
    kundliUrl: 'https://example.com/kundli.pdf',
    star: 'Bharani', raasi: 'Mesha', nakshatra: 'Bharani',
    ...overrides.mp,
  };
  return {
    profile: {
      findUnique: vi.fn().mockImplementation(({ select }: any) => {
        if (select?.seriousMode) return Promise.resolve({ seriousMode: profile.seriousMode });
        return Promise.resolve(profile);
      }),
    },
    profilePhoto: { count: vi.fn().mockResolvedValue(overrides.photos ?? 5) },
    profilePrompt: { count: vi.fn().mockResolvedValue(0) },
    profileInterest: { count: vi.fn().mockResolvedValue(0) },
    user: { findUnique: vi.fn().mockResolvedValue({ verified: true }) },
    matrimonialProfile: { findUnique: vi.fn().mockResolvedValue(mp) },
  } as any;
}

describe('v3.2 completion score — casual', () => {
  it('returns 0 for missing profile', async () => {
    const prisma = { profile: { findUnique: vi.fn().mockResolvedValue(null) } } as any;
    const r = await computeCompletionScore(prisma, 'u1');
    expect(r.score).toBe(0);
    expect(r.missing).toContain('profile');
  });

  it('a complete casual user scores >= 60 and threshold=60', async () => {
    const r = await computeCompletionScore(makeCasualPrisma(), 'u1');
    expect(r.threshold).toBe(CASUAL_THRESHOLD);
    expect(r.dtm).toBe(false);
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it('exposes per-bucket breakdown with point values', async () => {
    const r = await computeCompletionScore(makeCasualPrisma(), 'u1');
    expect(r.buckets.length).toBeGreaterThan(5);
    expect(r.buckets.every(b => typeof b.pts === 'number' && typeof b.earned === 'number')).toBe(true);
    expect(r.buckets.find(b => b.key === 'photos')!.pts).toBe(25);
  });

  it('photos bucket scales by count (4=18, 5=22, 6=25)', async () => {
    for (const [count, expected] of [[3, 12], [4, 18], [5, 22], [6, 25], [7, 25]] as const) {
      const r = await computeCompletionScore(makeCasualPrisma({ photos: count }), 'u1');
      expect(r.buckets.find(b => b.key === 'photos')!.earned).toBe(expected);
    }
  });

  it('sparse user falls below threshold and lists missing fields', async () => {
    const r = await computeCompletionScore(
      makeCasualPrisma({ photos: 0, prompts: 0, interests: 0, profile: { bio: '', city: '', profession: '' } }),
      'u1',
    );
    expect(r.score).toBeLessThan(60);
    expect(r.missing).toContain('photos');
    expect(r.missing).toContain('bio');
  });
});

describe('v3.2 completion score — DTM', () => {
  it('DTM threshold is 75 and dtm=true', async () => {
    const r = await computeCompletionScore(makeDtmPrisma(), 'u1');
    expect(r.threshold).toBe(DTM_THRESHOLD);
    expect(r.dtm).toBe(true);
  });

  it('a well-filled DTM user clears 75', async () => {
    const r = await computeCompletionScore(makeDtmPrisma(), 'u1');
    expect(r.score).toBeGreaterThanOrEqual(75);
  });

  it('DTM user without a MatrimonialProfile scores far below 75', async () => {
    const r = await computeCompletionScore(
      makeDtmPrisma({ mp: { maritalStatus: '', dateOfBirth: null, height: '', motherTongue: '', religion: '', caste: '', education: '', occupation: '', fatherOccupation: '', aboutMe: '', aboutFamily: '', partnerAgeMin: 0, partnerAgeMax: 0, kundliUrl: '', star: '', raasi: '', nakshatra: '' } }),
      'u1',
    );
    expect(r.score).toBeLessThan(75);
    expect(r.missing).toContain('maritalStatus');
    expect(r.missing).toContain('aboutMe');
  });

  it('DTM buckets carry visibility tiers', async () => {
    const r = await computeCompletionScore(makeDtmPrisma(), 'u1');
    expect(r.buckets.find(b => b.key === 'family')?.visibility).toBe('MATCHES_ONLY');
    expect(r.buckets.find(b => b.key === 'kundli')?.visibility).toBe('REQUEST_ACCESS');
    expect(r.buckets.find(b => b.key === 'maritalStatus')?.visibility).toBe('PUBLIC');
  });
});
