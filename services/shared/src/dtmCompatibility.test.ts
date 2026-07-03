import { describe, it, expect } from 'vitest';
import { computeDtmCompatibility } from './dtmCompatibility';

const aishwarya = {
  height: "5'7\"", religion: 'Hindu', caste: 'Iyer', manglik: 'No',
  motherTongue: 'Tamil', maritalStatus: 'Never Married',
  education: "Master's", occupation: 'Software Engineer',
  annualIncome: '20-35L', workingCity: 'Bengaluru',
  diet: 'vegetarian', smoking: 'never', drinking: 'rarely',
  familyType: 'Nuclear', familyValues: 'Moderate',
  partnerAgeMin: 28, partnerAgeMax: 36,
  partnerHeightMin: "5'8\"", partnerHeightMax: "6'2\"",
  partnerReligion: 'Hindu', partnerCaste: 'Any', partnerEducation: "Master's",
  partnerOccupation: 'Any', partnerIncome: '20-35L',
  partnerMaritalStatus: 'Never Married', partnerMotherTongue: 'Tamil',
  partnerManglik: "Don't know", partnerDiet: 'vegetarian',
  partnerSmoking: 'never', partnerDrinking: 'rarely',
  partnerFamilyType: 'Nuclear', partnerFamilyValues: 'Moderate',
  partnerLocations: 'Bengaluru,Chennai',
};
const ravi = {
  height: "5'10\"", religion: 'Hindu', caste: 'Iyengar', manglik: 'No',
  motherTongue: 'Tamil', maritalStatus: 'Never Married',
  education: "Master's", occupation: 'Software Engineer',
  annualIncome: '35-50L', workingCity: 'Bengaluru',
  diet: 'vegetarian', smoking: 'never', drinking: 'rarely',
  familyType: 'Nuclear', familyValues: 'Moderate',
  partnerAgeMin: 26, partnerAgeMax: 32,
  partnerHeightMin: "5'4\"", partnerHeightMax: "5'10\"",
  partnerReligion: 'Hindu', partnerCaste: 'Any', partnerEducation: "Master's",
  partnerOccupation: 'Any', partnerIncome: '20-35L',
  partnerMaritalStatus: 'Never Married', partnerMotherTongue: 'Tamil',
  partnerManglik: 'No', partnerDiet: 'vegetarian',
  partnerSmoking: 'never', partnerDrinking: 'rarely',
  partnerFamilyType: 'Nuclear', partnerFamilyValues: 'Moderate',
  partnerLocations: 'Bengaluru',
};

describe('v3.2 DTM compatibility', () => {
  it('two highly compatible profiles score ≥ 85', () => {
    const r = computeDtmCompatibility({ mine: aishwarya, myAge: 29, theirs: ravi, theirAge: 31 });
    expect(r.overall).toBeGreaterThanOrEqual(85);
    expect(r.hardBlockers.length).toBe(0);
  });

  it('returns per-axis breakdown with weights summing to 100', () => {
    const r = computeDtmCompatibility({ mine: aishwarya, myAge: 29, theirs: ravi, theirAge: 31 });
    const sum = r.axes.reduce((s, a) => s + a.weight, 0);
    expect(sum).toBe(100);
    expect(r.axes.find(a => a.key === 'religion')?.score).toBe(100);
    expect(r.axes.find(a => a.key === 'income')?.score).toBeGreaterThan(80);
  });

  it('hard religion mismatch zeroes the religion axis and flags blocker', () => {
    const r = computeDtmCompatibility({
      mine: { ...aishwarya, partnerReligion: 'Hindu' },
      myAge: 29,
      theirs: { ...ravi, religion: 'Christian' },
      theirAge: 31,
    });
    const rel = r.axes.find(a => a.key === 'religion')!;
    expect(rel.score).toBeLessThan(60);
    expect(r.hardBlockers).toContain('Religion');
  });

  it('age outside the requested range tanks the age axis', () => {
    const r = computeDtmCompatibility({
      mine: aishwarya, myAge: 29,
      theirs: ravi, theirAge: 45,
    });
    expect(r.axes.find(a => a.key === 'age')!.score).toBeLessThan(60);
  });

  it('income preference is satisfied when candidate earns above the band', () => {
    const r = computeDtmCompatibility({
      mine: { ...aishwarya, partnerIncome: '20-35L' },
      myAge: 29,
      theirs: { ...ravi, annualIncome: '50-75L' },
      theirAge: 31,
    });
    expect(r.axes.find(a => a.key === 'income')!.score).toBeGreaterThanOrEqual(95);
  });

  it('"Any" preference always scores 100', () => {
    const r = computeDtmCompatibility({
      mine: { ...aishwarya, partnerCaste: 'Any', partnerOccupation: 'Any' },
      myAge: 29,
      theirs: { ...ravi, caste: 'Brahmin', occupation: 'Teacher' },
      theirAge: 31,
    });
    expect(r.axes.find(a => a.key === 'caste')!.score).toBe(100);
    expect(r.axes.find(a => a.key === 'occupation')!.score).toBeGreaterThanOrEqual(50);
  });
});
