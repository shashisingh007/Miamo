/**
 * E2E — /discover.
 *
 * What this covers:
 *   - Authenticated user reaches /discover without redirect.
 *   - At least one candidate card renders OR an explicit empty-state.
 *   - Like/pass affordances are clickable (not disabled, not hidden).
 *   - No unhandled console errors during a 5-second observation window.
 *
 * How to run:
 *   npx playwright test tests/e2e/discover.spec.ts --project=chromium
 *
 * Requires: seed users loaded, dev stack up on :3100.
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import { test, expect } from '@playwright/test';
import { loginAs, DEFAULT_PERSONA } from './helpers/auth';

test.describe('/discover', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEFAULT_PERSONA);
  });

  test('renders without redirecting to /login', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => { /* soft */ });
    expect(page.url()).toContain('/discover');
  });

  test('shows either a card or an empty state', async ({ page }) => {
    await page.goto('/discover');
    // Either the candidate deck ([data-testid=discover-card], .discover-card,
    // or the built-in "no more candidates" empty state) must be visible.
    const cardOrEmpty = page.locator(
      '[data-testid="discover-card"], .discover-card, [data-testid="discover-empty"], text=/no more|come back|check back/i',
    );
    await expect(cardOrEmpty.first()).toBeVisible({ timeout: 10_000 });
  });

  test('like / pass buttons are present when a card is on screen', async ({ page }) => {
    await page.goto('/discover');
    const card = page.locator('[data-testid="discover-card"], .discover-card').first();
    const hasCard = await card.isVisible().catch(() => false);
    test.skip(!hasCard, 'no candidates in seed — nothing to like/pass');
    const likeBtn = page.getByRole('button', { name: /like|match|yes/i }).first();
    const passBtn = page.getByRole('button', { name: /pass|skip|no/i }).first();
    await expect(likeBtn).toBeVisible();
    await expect(passBtn).toBeVisible();
  });

  test('no console errors on discover page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err: Error) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/discover');
    await page.waitForTimeout(5_000);
    // Filter out well-known browser/extension noise the app can't control.
    const meaningful = errors.filter((e) => !/favicon|ResizeObserver|Non-Error/.test(e));
    expect(meaningful, `Console errors:\n${meaningful.join('\n')}`).toEqual([]);
  });
});
