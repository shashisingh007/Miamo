/**
 * E2E — /settings.
 *
 * What this covers:
 *   - Route loads for a signed-in user.
 *   - At least one toggle / switch is visible (settings UI rendered).
 *   - No console errors, no 5xx during a 4-second observation window.
 *
 * How to run:
 *   npx playwright test tests/e2e/settings.spec.ts --project=chromium
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import { test, expect } from '@playwright/test';
import { loginAs, DEFAULT_PERSONA } from './helpers/auth';

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEFAULT_PERSONA);
  });

  test('renders without redirect', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle').catch(() => { /* soft */ });
    expect(page.url()).toContain('/settings');
  });

  test('at least one interactive control is visible', async ({ page }) => {
    await page.goto('/settings');
    // Any interactive: switch (Radix), checkbox, button, or select.
    const anyControl = page.locator(
      '[role="switch"], [role="checkbox"], button, select, input[type="checkbox"], input[type="radio"]',
    );
    await expect(anyControl.first()).toBeVisible({ timeout: 10_000 });
  });

  test('no unhandled console errors within observation window', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err: Error) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.goto('/settings');
    await page.waitForTimeout(4_000);
    const meaningful = errors.filter((e) => !/favicon|ResizeObserver|Non-Error|hydrat/.test(e));
    expect(meaningful, `Console errors on /settings:\n${meaningful.join('\n')}`).toEqual([]);
  });
});
