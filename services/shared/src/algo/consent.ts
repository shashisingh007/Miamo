/**
 * Consent enforcement — the algo layer's single gate.
 *
 * Every ranking signal that depends on the reader user's tracked behavior
 * MUST go through withConsent(). If the reader hasn't granted the required
 * scope, the signal returns its fallback value (typically 0 or a uniform
 * demographic baseline) and the algorithm's explain() will report
 * `consentScope` accordingly.
 *
 * Scopes mirror the values in services/web/src/lib/track/consent.ts:
 *   - 'analytics'      → required for any aggregate read (FeatureSnapshot)
 *   - 'personalization'→ required for any pair-aware read (PairCompatCache,
 *                        priorTargets, embeddings used in cross-user scoring)
 *   - 'marketing'      → unused by v4 algos; reserved for future ad scoring
 */
export type ConsentScope = 'analytics' | 'personalization' | 'marketing';
export type ConsentResolver = (userId: string) => Promise<Set<ConsentScope>>;

export type AlgoConsentTag = 'full' | 'personalization-only' | 'analytics-only' | 'none';

export function consentTagFromScopes(scopes: Set<ConsentScope>): AlgoConsentTag {
  const a = scopes.has('analytics');
  const p = scopes.has('personalization');
  if (a && p) return 'full';
  if (p) return 'personalization-only';
  if (a) return 'analytics-only';
  return 'none';
}

export async function withConsent<T>(
  userId: string,
  scope: ConsentScope,
  resolver: ConsentResolver,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const scopes = await resolver(userId);
  if (!scopes.has(scope)) return fallback;
  return read();
}

/** Build a resolver that reads the most-recent ConsentEvent for the user. */
import type { PrismaClient } from '@prisma/client';
export function makePrismaConsentResolver(prisma: PrismaClient): ConsentResolver {
  return async (userId: string) => {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT scopes FROM "ConsentEvent"
       WHERE "userId" = $1
       ORDER BY ts DESC LIMIT 1`,
      userId,
    )) as Array<{ scopes: string[] | null }>;
    return new Set((rows[0]?.scopes || []) as ConsentScope[]);
  };
}

/** No-op resolver for tests / pre-auth contexts (grants nothing). */
export const denyAllResolver: ConsentResolver = async () => new Set();
/** Grant-all resolver for fixtures and golden-path tests. */
export const grantAllResolver: ConsentResolver = async () => new Set(['analytics', 'personalization', 'marketing']);
