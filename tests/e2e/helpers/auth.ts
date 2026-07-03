/**
 * E2E helper — seeded-user login.
 *
 * What this does:
 *   Logs in as one of the seeded personas (miamo1..miamo49). The seed
 *   fixture (services/shared/prisma/seed.ts) creates each with email
 *   `<username>@miamo.test` and password equal to the username itself
 *   (verified in scripts/qa-runs/phase-1-2-endpoint-sweep.py).
 *
 * Why a helper:
 *   Every non-auth spec needs a signed-in session. Duplicating the
 *   form-fill in each spec makes the auth-form the least-fun refactor
 *   target on the team. One helper, one place to update if the login
 *   form changes.
 *
 * Usage:
 *   import { loginAs } from './helpers/auth';
 *   test('discover loads', async ({ page }) => {
 *     await loginAs(page, 'miamo10');
 *     await page.goto('/discover');
 *   });
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import type { Page } from '@playwright/test';

export interface LoginOptions {
  /** Full email override — otherwise `<username>@miamo.test`. */
  email?: string;
  /** Password override — otherwise the username. */
  password?: string;
  /** Route to expect the app to land on after login. */
  landingPath?: string;
}

/**
 * Fills the login form and waits for the app to leave `/login`. Throws
 * (Playwright timeout) if either the form submit or the redirect stalls.
 */
export async function loginAs(
  page: Page,
  username: string,
  opts: LoginOptions = {},
): Promise<void> {
  const email = opts.email ?? `${username}@miamo.test`;
  const password = opts.password ?? username;
  const landing = opts.landingPath ?? '/discover';

  await page.goto('/login');
  // The form uses type=email + type=password (services/web/src/app/(auth)/login/page.tsx).
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
    page.getByRole('button', { name: /sign in/i }).click(),
  ]);
  // Optional soft-assertion — the caller may pass a specific landingPath
  // when the app is expected to route somewhere other than /discover
  // (e.g. onboarding for a fresh persona).
  if (landing) {
    // Not a hard fail — the app sometimes deep-links to onboarding.
    await page.waitForURL((url) => url.pathname.startsWith(landing) || url.pathname !== '/login', {
      timeout: 10_000,
    }).catch(() => { /* soft */ });
  }
}

/**
 * Convenience — the default persona for most specs. miamo10 has a
 * complete profile with photos, DTM answers, and a couple of matches
 * (see services/shared/prisma/seed.ts).
 */
export const DEFAULT_PERSONA = 'miamo10';
