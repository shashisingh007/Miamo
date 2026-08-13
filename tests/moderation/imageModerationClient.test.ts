/**
 * Unit tests — image moderation client.
 *
 * Covers the three implementations behind `ImageModerator`:
 *   - LocalStubModerator  — always approves (dev + test default)
 *   - AwsRekognitionModerator — throws unless `AWS_REKOGNITION_ENABLED=1`
 *   - KeywordModerator    — url-blocklist match → hard-reject
 * plus the `getImageModerator()` factory selector.
 *
 * We never call the real AWS SDK in tests. The Rekognition class is
 * tested for its refusal-to-run guard only. Cross-ref:
 *   - services/shared/src/moderation/imageModerationClient.ts
 *   - docs/architecture/moderation-pipeline.md
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.11
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalStubModerator,
  AwsRekognitionModerator,
  KeywordModerator,
  getImageModerator,
} from '../../services/shared/src/moderation/imageModerationClient';

describe('LocalStubModerator', () => {
  const mod = new LocalStubModerator();

  it('approves any URL', async () => {
    const d = await mod.moderateImage('https://example.com/x.jpg');
    expect(d.approved).toBe(true);
    expect(d.categories).toEqual([]);
    expect(d.severity).toBe('none');
  });

  it('approves an empty URL', async () => {
    const d = await mod.moderateImage('');
    expect(d.approved).toBe(true);
  });

  it('never sets confidence above 0 on approval', async () => {
    const d = await mod.moderateImage('https://any.example');
    expect(d.confidence).toBe(0);
  });

  it('returns a stable shape (approved / categories / severity / reason)', async () => {
    const d = await mod.moderateImage('https://example.com/y.png');
    expect(d).toHaveProperty('approved');
    expect(d).toHaveProperty('categories');
    expect(d).toHaveProperty('severity');
    expect(d).toHaveProperty('reason');
    expect(d).toHaveProperty('confidence');
  });
});

describe('AwsRekognitionModerator', () => {
  const originalEnv = process.env.AWS_REKOGNITION_ENABLED;

  beforeEach(() => {
    delete process.env.AWS_REKOGNITION_ENABLED;
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AWS_REKOGNITION_ENABLED;
    else process.env.AWS_REKOGNITION_ENABLED = originalEnv;
  });

  it('throws when AWS_REKOGNITION_ENABLED is unset — refuses to silently under-moderate', async () => {
    const mod = new AwsRekognitionModerator();
    await expect(mod.moderateImage('https://example.com/a.jpg')).rejects.toThrow(/AWS_REKOGNITION_ENABLED/);
  });

  it('throws when AWS_REKOGNITION_ENABLED is a truthy-looking string other than "1"', async () => {
    process.env.AWS_REKOGNITION_ENABLED = 'true';
    const mod = new AwsRekognitionModerator();
    await expect(mod.moderateImage('https://example.com/b.jpg')).rejects.toThrow(/AWS_REKOGNITION_ENABLED/);
  });

  it('returns an approved-shaped decision when the flag is exactly "1" (stub until SDK lands)', async () => {
    process.env.AWS_REKOGNITION_ENABLED = '1';
    const mod = new AwsRekognitionModerator();
    const d = await mod.moderateImage('https://example.com/c.jpg');
    // Scaffold stage: returns APPROVED. The interface is real; the
    // SDK integration lands in Phase H.
    expect(d.approved).toBe(true);
  });
});

describe('KeywordModerator', () => {
  it('approves a plain URL when the blocklist is empty', async () => {
    const mod = new KeywordModerator();
    const d = await mod.moderateImage('https://cdn.miamo.in/user/abc.jpg');
    expect(d.approved).toBe(true);
  });

  it('returns a stable shape on approval', async () => {
    const mod = new KeywordModerator();
    const d = await mod.moderateImage('https://cdn.miamo.in/user/xyz.jpg');
    expect(d.categories).toEqual([]);
    expect(d.severity).toBe('none');
    expect(d.confidence).toBe(0);
  });
});

describe('getImageModerator() factory', () => {
  const originalEnv = process.env.AWS_REKOGNITION_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.AWS_REKOGNITION_ENABLED;
    else process.env.AWS_REKOGNITION_ENABLED = originalEnv;
  });

  it('returns LocalStubModerator when AWS_REKOGNITION_ENABLED is unset', () => {
    delete process.env.AWS_REKOGNITION_ENABLED;
    const mod = getImageModerator();
    expect(mod).toBeInstanceOf(LocalStubModerator);
  });

  it('returns AwsRekognitionModerator when AWS_REKOGNITION_ENABLED=1', () => {
    process.env.AWS_REKOGNITION_ENABLED = '1';
    const mod = getImageModerator();
    expect(mod).toBeInstanceOf(AwsRekognitionModerator);
  });

  it('falls back to LocalStub for any non-"1" value ("0", "true", "yes", empty string)', () => {
    for (const val of ['0', 'true', 'yes', '', 'YES']) {
      process.env.AWS_REKOGNITION_ENABLED = val;
      expect(getImageModerator()).toBeInstanceOf(LocalStubModerator);
    }
  });
});
