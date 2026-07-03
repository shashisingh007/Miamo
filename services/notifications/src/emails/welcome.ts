// ─── Welcome email (G.16 + G.18 activation touchpoint 0h) ──────────
// Sent immediately after signup completes. Flag-gated behind
// FEATURE_ACTIVATION_EMAILS_ENABLED at the caller (tracking-worker).

import { chrome, escapeHtml, textShell, type RenderedEmail } from './render';

export interface WelcomeData {
  displayName: string;
  discoverUrl?: string; // deep-link into /discover
}

export function renderWelcome(data: WelcomeData): RenderedEmail {
  const name = escapeHtml(data.displayName || 'there');
  const url = data.discoverUrl || 'https://miamo.in/discover';
  const subject = `Welcome to Miamo, ${data.displayName || 'friend'}`;
  const body = `<h2 style="margin:0 0 12px;font-size:24px;color:#2B1F17;">Welcome, ${name}.</h2>
<p style="margin:0 0 16px;line-height:1.6;font-size:15px;">
We designed Miamo for people who take their time. No swiping. No stats.
Just profiles that make sense together, revealed a few at a time.
</p>
<p style="margin:0 0 24px;line-height:1.6;font-size:15px;">
Your first Discover queue is ready. Come see who we picked.
</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#C97856;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Open Discover</a></p>`;

  const text = textShell([
    `Welcome, ${data.displayName || 'friend'}.`,
    `We designed Miamo for people who take their time. No swiping. No stats. Just profiles that make sense together, revealed a few at a time.`,
    `Your first Discover queue is ready.`,
    `Open Discover: ${url}`,
  ]);

  return { subject, html: chrome({ preheader: 'Your first Discover queue is ready.', body }), text };
}
