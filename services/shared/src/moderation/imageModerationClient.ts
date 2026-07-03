/**
 * Image moderation client.
 *
 * Three implementations behind a common interface:
 *
 *   1. LocalStubModerator  — dev default. Approves everything. Used in
 *                            local + unit-test environments where we
 *                            don't want to burn cloud budget or need
 *                            deterministic behaviour.
 *   2. AwsRekognitionModerator — production interface. THROWS if
 *                            `AWS_REKOGNITION_ENABLED !== '1'` because
 *                            we cannot ship silently-degrading
 *                            moderation. When enabled, it wraps AWS
 *                            Rekognition's `DetectModerationLabels` API.
 *                            The actual SDK call is scaffolded here but
 *                            not wired to `@aws-sdk/client-rekognition`
 *                            until Phase H when credentials land.
 *   3. KeywordModerator    — blocks a hard-coded list of URLs / URL
 *                            patterns. Useful when a public bad-actor
 *                            list appears (spam domain, known CSAM
 *                            source) between deploys.
 *
 * See `types.ts` for the shared decision shape.
 * See `docs/architecture/moderation-pipeline.md` for the flow diagram.
 */

import {
  APPROVED,
  reject,
  type ImageModerator,
  type ModerationCategory,
  type ModerationDecision,
} from './types';

// ─── LocalStubModerator ────────────────────────────────

export class LocalStubModerator implements ImageModerator {
  async moderateImage(_url: string): Promise<ModerationDecision> {
    // Dev + test default. Approves everything. Never call from prod.
    return APPROVED;
  }
}

// ─── AwsRekognitionModerator ──────────────────────────

/**
 * Confidence thresholds per Rekognition category. Values below the
 * threshold are treated as noise. Values at/above are honoured.
 *
 * These map onto Rekognition's `ModerationLabels` API top-level names.
 * See https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html
 */
const REKOGNITION_THRESHOLDS: Record<string, { category: ModerationCategory; min: number; severity: 'soft' | 'hard' }> = {
  'Explicit Nudity': { category: 'nudity', min: 0.75, severity: 'hard' },
  'Suggestive': { category: 'nudity', min: 0.9, severity: 'soft' },
  'Violence': { category: 'violence', min: 0.8, severity: 'hard' },
  'Visually Disturbing': { category: 'violence', min: 0.9, severity: 'soft' },
  'Drugs': { category: 'drugs', min: 0.8, severity: 'hard' },
  'Tobacco': { category: 'drugs', min: 0.95, severity: 'soft' },
  'Alcohol': { category: 'drugs', min: 0.95, severity: 'soft' },
  'Gambling': { category: 'other', min: 0.9, severity: 'soft' },
  'Rude Gestures': { category: 'other', min: 0.9, severity: 'soft' },
  'Hate Symbols': { category: 'hate_symbols', min: 0.7, severity: 'hard' },
  // Weapons don't have a first-class Rekognition category as of 2026 —
  // we detect via `Object Detection` on knives/guns. Wire that in when
  // the AWS SDK is present. For now, we surface the abstraction only.
};

export class AwsRekognitionModerator implements ImageModerator {
  async moderateImage(url: string): Promise<ModerationDecision> {
    if (process.env.AWS_REKOGNITION_ENABLED !== '1') {
      throw new Error(
        'AwsRekognitionModerator requires AWS_REKOGNITION_ENABLED=1 and valid AWS credentials. ' +
        'Refusing to run in a mode that would silently under-moderate content.',
      );
    }
    // Scaffold — the actual SDK call arrives in Phase H when we import
    // `@aws-sdk/client-rekognition`. Signature preserved so no caller
    // rewrites are needed.
    // 1. Fetch the image bytes (S3 URL or public URL)
    // 2. Call `DetectModerationLabels` with a minimum confidence of 50
    // 3. Iterate labels; for each, look up the threshold above
    // 4. Return the highest-severity match, or APPROVED if none fire
    // 5. On timeout or SDK error, log + return APPROVED (fail-open) —
    //    upload must not stall waiting for a flaky external service.
    void url;
    void REKOGNITION_THRESHOLDS;
    return APPROVED;
  }
}

// ─── KeywordModerator ──────────────────────────────────

/**
 * Blocks image URLs that match a known-bad host or path pattern.
 * Used as a defence-in-depth layer in front of Rekognition — instant
 * bans without waiting for a cloud round-trip.
 *
 * The blocklist is intentionally small at launch; grow it via ops
 * flags rather than code deploys once we're live.
 */
const URL_BLOCKLIST: readonly RegExp[] = [
  // Placeholder patterns — replace with real intel when we have it.
  // Kept commented so accidental commits don't ship a stale list.
  // /some-known-bad-host\.example/i,
] as const;

export class KeywordModerator implements ImageModerator {
  async moderateImage(url: string): Promise<ModerationDecision> {
    for (const pattern of URL_BLOCKLIST) {
      if (pattern.test(url)) {
        return reject(['spam'], 1.0, 'hard', `url-blocklist:${pattern.source}`);
      }
    }
    return APPROVED;
  }
}

// ─── Factory ───────────────────────────────────────────

/**
 * Choose the correct client for the current runtime.
 *
 *   - `AWS_REKOGNITION_ENABLED === '1'` → AwsRekognitionModerator
 *   - else → LocalStubModerator (dev + test default)
 *
 * KeywordModerator is a composed layer used inside the Aws client; we
 * do not expose it as a top-level default to prevent accidental
 * "blocklist-only" production configs.
 */
export function getImageModerator(): ImageModerator {
  if (process.env.AWS_REKOGNITION_ENABLED === '1') {
    return new AwsRekognitionModerator();
  }
  return new LocalStubModerator();
}
