// ─── Match-alert email (G.16) ─────────────────────────────────────
// Sent when a new mutual match is created. Flag-gated behind
// EMAIL_MATCH_ALERT_ENABLED at the caller. Respects
// Settings.matchEmailsEnabled + Settings.marketingEmailsEnabled off-switch.

import { chrome, escapeHtml, textShell, type RenderedEmail } from './render';

export interface MatchAlertData {
  recipientName: string;
  matchedName: string;
  chatUrl?: string;
  matchedAvatarUrl?: string;
}

export function renderMatchAlert(data: MatchAlertData): RenderedEmail {
  const you = escapeHtml(data.recipientName || 'there');
  const them = escapeHtml(data.matchedName || 'someone new');
  const url = data.chatUrl || 'https://miamo.in/matches';
  const subject = `It's a match — say hi to ${data.matchedName || 'someone new'}`;

  const avatar = data.matchedAvatarUrl
    ? `<img src="${escapeHtml(data.matchedAvatarUrl)}" alt="" width="72" height="72" style="border-radius:36px;display:block;margin:0 auto 16px;object-fit:cover;"/>`
    : '';

  const body = `<h2 style="margin:0 0 12px;font-size:24px;color:#2B1F17;text-align:center;">It's a match, ${you}.</h2>
${avatar}
<p style="margin:0 0 16px;line-height:1.6;font-size:15px;text-align:center;">
${them} liked you back. The first Move is the whole game — a small, specific ask beats "hey" every time.
</p>
<p style="text-align:center;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#C97856;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Open the chat</a></p>`;

  const text = textShell([
    `It's a match, ${data.recipientName || 'there'}.`,
    `${data.matchedName || 'Someone new'} liked you back. The first Move is the whole game — a small, specific ask beats "hey" every time.`,
    `Open the chat: ${url}`,
  ]);

  return { subject, html: chrome({ preheader: `${data.matchedName || 'Someone'} liked you back.`, body }), text };
}
