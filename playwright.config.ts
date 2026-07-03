/**
 * Playwright config — Phase G.5 E2E scaffold.
 *
 * What this does:
 *   Configures Playwright to run every spec under `tests/e2e/` across
 *   five browser projects: chromium, webkit, firefox, mobile-chrome
 *   (Pixel 5 device emulation), mobile-safari (iPhone 13 emulation).
 *
 * How to run (one-time setup):
 *   npm install                     # picks up @playwright/test devDep
 *   npx playwright install          # downloads chromium + webkit + firefox
 *                                   # (~250 MB — leave to the founder)
 *
 * Daily loop:
 *   npm run test:e2e                # headless run across all 5 projects
 *   npm run test:e2e:ui             # interactive UI mode for debugging
 *   npx playwright test tests/e2e/auth.spec.ts --project=chromium
 *
 * The baseURL matches the web app's dev port (services/web/package.json:
 *   `next dev -p 3100`). Start the stack via `bash scripts/start.sh local
 *   dev` before running.
 *
 * Retries + traces: 1 retry on CI, 0 locally. Trace + screenshot only on
 * first retry — keeps the artifact directory small while still giving a
 * post-mortem when a test flakes.
 */
// @ts-expect-error — install @playwright/test to resolve this import.
// Types resolve once `npm install` picks up the devDependency added in
// package.json. Kept as expect-error so `npm run typecheck` stays green
// even before the install runs.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
});
