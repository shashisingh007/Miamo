/**
 * E2E — /messages.
 *
 * What this covers:
 *   - Signed-in user reaches /messages without a redirect.
 *   - Either the chat-list rail or the "no chats yet" empty-state renders.
 *   - Clicking the first chat (if present) opens a thread with a composer.
 *   - Composer input accepts text without throwing.
 *
 * How to run:
 *   npx playwright test tests/e2e/messages.spec.ts
 */
// @ts-expect-error — install @playwright/test to resolve this import.
import { test, expect } from '@playwright/test';
import { loginAs, DEFAULT_PERSONA } from './helpers/auth';

test.describe('/messages', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, DEFAULT_PERSONA);
  });

  test('loads without auth redirect', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForLoadState('networkidle').catch(() => { /* soft */ });
    expect(page.url()).toContain('/messages');
  });

  test('shows either the chat list or an empty state', async ({ page }) => {
    await page.goto('/messages');
    const chatListOrEmpty = page.locator(
      '[data-testid="chat-list"], [data-testid="chat-list-item"], [data-testid="messages-empty"], text=/no chats|no conversations|start a conversation/i',
    );
    await expect(chatListOrEmpty.first()).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a chat (if any) reveals the composer', async ({ page }) => {
    await page.goto('/messages');
    const firstChat = page.locator('[data-testid="chat-list-item"]').first();
    const hasChat = await firstChat.isVisible().catch(() => false);
    test.skip(!hasChat, 'no seeded chats — nothing to open');
    await firstChat.click();
    const composer = page.locator(
      '[data-testid="chat-composer"] textarea, [data-testid="chat-composer"] input, textarea[placeholder*="message" i]',
    ).first();
    await expect(composer).toBeVisible({ timeout: 5_000 });
    await composer.fill('E2E test message — do not send');
    // Do NOT press Enter — we don't want to litter the seeded chat with
    // test messages during dev runs. Test only asserts the composer is
    // interactive.
    await expect(composer).toHaveValue(/E2E test message/);
  });
});
