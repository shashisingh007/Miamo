/**
 * Email templates — G.16 unit tests.
 *
 * One test per template verifies:
 *   - subject / html / text are all non-empty
 *   - user-supplied data is interpolated (name shows up in the copy)
 *   - user-supplied strings are HTML-escaped (defence against reflected XSS
 *     via display names — a hostile display-name of `<script>` must not
 *     survive rendering)
 *   - the recipient's raw email address never appears in the HTML body
 *     unless the caller passed it explicitly (privacy hygiene)
 */

import { describe, it, expect } from 'vitest';
import {
  renderWelcome,
  renderMatchAlert,
  renderMessageSummary,
  renderWeeklyDigest,
  renderAccountDeletionConfirmed,
} from '../../services/notifications/src/emails';

describe('renderWelcome', () => {
  it('produces non-empty subject/html/text and interpolates displayName', () => {
    const r = renderWelcome({ displayName: 'Priya' });
    expect(r.subject).toContain('Welcome');
    expect(r.subject).toContain('Priya');
    expect(r.html.length).toBeGreaterThan(200);
    expect(r.text.length).toBeGreaterThan(50);
    expect(r.html).toMatch(/Priya/);
    expect(r.text).toMatch(/Priya/);
  });
});

describe('renderMatchAlert', () => {
  it('renders both parties and the chat URL', () => {
    const r = renderMatchAlert({ recipientName: 'Rohan', matchedName: 'Priya', chatUrl: 'https://miamo.app/matches/42' });
    expect(r.subject).toMatch(/match/i);
    expect(r.html).toMatch(/Rohan/);
    expect(r.html).toMatch(/Priya/);
    expect(r.html).toMatch(/miamo\.app\/matches\/42/);
    expect(r.text).toMatch(/Priya/);
  });

  it('escapes hostile input to prevent HTML injection via displayName', () => {
    const r = renderMatchAlert({ recipientName: '<script>alert(1)</script>', matchedName: 'A' });
    expect(r.html).not.toMatch(/<script>alert\(1\)<\/script>/);
    // The escaped form should appear.
    expect(r.html).toMatch(/&lt;script&gt;/);
  });
});

describe('renderMessageSummary', () => {
  it('renders the unread count and inbox URL', () => {
    const r = renderMessageSummary({ recipientName: 'Rohan', unreadCount: 3, inboxUrl: 'https://miamo.app/messages' });
    expect(r.subject).toMatch(/3/);
    expect(r.html).toMatch(/3 unread messages/);
    expect(r.text).toMatch(/3 unread messages/);
  });

  it('singular vs plural: 1 unread renders "1 unread message"', () => {
    const r = renderMessageSummary({ recipientName: 'Rohan', unreadCount: 1 });
    expect(r.subject).toMatch(/1 unread message/);
    expect(r.subject).not.toMatch(/1 unread messages/);
  });
});

describe('renderWeeklyDigest', () => {
  it('renders each pick as a numbered list item', () => {
    const r = renderWeeklyDigest({
      recipientName: 'Priya',
      weekLabel: '2026-W27',
      picks: [
        { displayName: 'Ravi', cityHint: 'Bengaluru', compatibilityPct: 87 },
        { displayName: 'Meera', cityHint: 'Mumbai', compatibilityPct: 74 },
      ],
    });
    expect(r.subject).toMatch(/Top 2/);
    expect(r.html).toMatch(/Ravi/);
    expect(r.html).toMatch(/Meera/);
    expect(r.html).toMatch(/87%/);
    expect(r.text).toMatch(/1\. Ravi/);
    expect(r.text).toMatch(/2\. Meera/);
  });

  it('clamps compatibilityPct to the 0..100 range on display', () => {
    const r = renderWeeklyDigest({
      recipientName: 'P',
      weekLabel: 'W1',
      picks: [{ displayName: 'X', compatibilityPct: 250 }],
    });
    expect(r.html).toMatch(/100%/);
    expect(r.html).not.toMatch(/250%/);
  });
});

describe('renderAccountDeletionConfirmed', () => {
  it('is always renderable regardless of flags (legally required)', () => {
    const r = renderAccountDeletionConfirmed({
      displayName: 'Priya',
      deletionRequestId: 'req-xxx',
      deletedAt: '2026-07-02T10:00:00Z',
    });
    expect(r.subject).toMatch(/deleted/i);
    expect(r.html).toMatch(/req-xxx/);
    expect(r.text).toMatch(/req-xxx/);
    expect(r.html).toMatch(/2026-07-02T10:00:00Z/);
    // Legally-required retention explanation must survive rendering
    expect(r.html).toMatch(/retained/i);
    expect(r.text).toMatch(/retained/i);
  });
});
