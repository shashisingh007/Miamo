import { describe, it, expect } from 'vitest';
import { redactProfile, fieldVisibility } from './visibility';

const dtm = {
  userId: 'u1', fullName: 'Asha', maritalStatus: 'Never Married',
  company: 'Acme Corp', annualIncome: '25-35L',
  fatherOccupation: 'Doctor',
  kundliUrl: 'https://example.com/k.pdf', star: 'Bharani',
  // pass-through (unmapped)
  createdAt: new Date('2024-01-01'),
};

describe('v3.2 visibility redaction', () => {
  it('self always sees everything', () => {
    const out = redactProfile(dtm, 'dtm', { viewerRel: 'self' })!;
    expect(out.company).toBe('Acme Corp');
    expect(out.kundliUrl).toBe('https://example.com/k.pdf');
  });

  it('public viewer sees only PUBLIC fields', () => {
    const out = redactProfile(dtm, 'dtm', { viewerRel: 'public' })!;
    expect(out.fullName).toBe('Asha');
    expect(out.maritalStatus).toBe('Never Married');
    expect(out.company).toBeUndefined();
    expect(out.annualIncome).toBeUndefined();
    expect(out.fatherOccupation).toBeUndefined();
    expect(out.kundliUrl).toBeUndefined();
  });

  it('match sees PUBLIC + MATCHES_ONLY but not REQUEST_ACCESS without grant', () => {
    const out = redactProfile(dtm, 'dtm', { viewerRel: 'match' })!;
    expect(out.company).toBe('Acme Corp');
    expect(out.fatherOccupation).toBe('Doctor');
    expect(out.kundliUrl).toBeUndefined();
    expect(out.star).toBeUndefined();
  });

  it('approved access grants reveal REQUEST_ACCESS fields', () => {
    const grants = new Set(['kundliUrl']);
    const out = redactProfile(dtm, 'dtm', { viewerRel: 'access', grants })!;
    expect(out.kundliUrl).toBe('https://example.com/k.pdf');
    expect(out.star).toBeUndefined(); // not in grants
  });

  it('unknown keys (id, timestamps) pass through', () => {
    const out = redactProfile(dtm, 'dtm', { viewerRel: 'public' })!;
    expect(out.userId).toBe('u1');
    expect(out.createdAt).toBeInstanceOf(Date);
  });

  it('casual profile is fully public', () => {
    const casual = { age: 28, gender: 'female', city: 'Mumbai', bio: 'hi' };
    const out = redactProfile(casual, 'casual', { viewerRel: 'public' })!;
    expect(out.age).toBe(28);
    expect(out.bio).toBe('hi');
  });

  it('fieldVisibility lookup works', () => {
    expect(fieldVisibility('dtm', 'company')).toBe('MATCHES_ONLY');
    expect(fieldVisibility('dtm', 'kundliUrl')).toBe('REQUEST_ACCESS');
    expect(fieldVisibility('dtm', 'fullName')).toBe('PUBLIC');
  });
});
