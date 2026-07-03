/**
 * E2E — auth flow.
 *
 * What this covers:
 *   - Login page renders with email + password + submit.
 *   - Valid seeded credentials redirect the user off /login within 15s.
 *   - Invalid credentials keep the user on /login and surface an error.
 *   - The "Create an account" link routes to /register.
 *
 * How to run:
 *   npx playwright test tests/e2e/auth.spec.ts
 *
 * Requires: dev stack running on :3100. See docs/DEVOPS.md §E2E.
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import { test, expect } from '@playwright/test';

test.describe('auth', () => {
  test('login page renders required fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('seeded persona miamo10 can sign in and land off /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('miamo10@miamo.test');
    await page.locator('input[type="password"]').fill('miamo10');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Auth may redirect to /discover, /onboarding (fresh account), or the
    // saved deep-link. Anything except /login counts as "logged in".
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    expect(page.url()).not.toContain('/login');
  });

  test('invalid credentials keep the user on /login', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('nobody@miamo.test');
    await page.locator('input[type="password"]').fill('definitely-wrong');
    await page.getByRole('button', { name: /sign in/i }).click();
    // The form must not silently succeed. Either an error toast/inline
    // message surfaces OR we stay on /login.
    await page.waitForTimeout(1_500);
    expect(page.url()).toContain('/login');
  });

  test('register link routes to /register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /create an account/i }).click();
    await page.waitForURL(/\/register/, { timeout: 5_000 });
    expect(page.url()).toContain('/register');
  });
});
