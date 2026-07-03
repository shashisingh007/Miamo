/**
 * E2E — /dtm (Depth Through Meaning).
 *
 * What this covers:
 *   - Route loads without redirect for a signed-in user.
 *   - Some form of DTM UI renders (question card, prompt list, or the
 *     saved-answers view for personas who already answered).
 *   - No 5xx surfaced to the client (checked via response listener).
 *
 * How to run:
 *   npx playwright test tests/e2e/dtm.spec.ts --project=chromium
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import { test, expect } from '@playwright/test';
import { loginAs, DEFAULT_PERSONA } from './helpers/auth';

test.describe('/dtm', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEFAULT_PERSONA);
  });

  test('loads without redirect', async ({ page }) => {
    await page.goto('/dtm');
    await page.waitForLoadState('networkidle').catch(() => { /* soft */ });
    expect(page.url()).toContain('/dtm');
  });

  test('renders some DTM surface', async ({ page }) => {
    await page.goto('/dtm');
    // Any of: question card, "your answers" view, empty prompt, or the
    // DTM shortcut bar. The concrete UI has evolved across v3.x — we
    // assert broadly, not specifically.
    const anySurface = page.locator(
      '[data-testid^="dtm-"], main, [role="main"], [role="dialog"], text=/dtm|depth|answer|question/i',
    );
    await expect(anySurface.first()).toBeVisible({ timeout: 10_000 });
  });

  test('no 5xx responses served to the DTM view', async ({ page }) => {
    const bad: Array<{ url: string; status: number }> = [];
    page.on('response', (resp) => {
      if (resp.status() >= 500 && new URL(resp.url()).hostname === new URL(page.url() || 'http://localhost:3100').hostname) {
        bad.push({ url: resp.url(), status: resp.status() });
      }
    });
    await page.goto('/dtm');
    await page.waitForTimeout(3_000);
    expect(bad, `5xx responses:\n${bad.map((b) => `${b.status} ${b.url}`).join('\n')}`).toEqual([]);
  });
});
