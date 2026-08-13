// ─── Daily unread-message digest (G.16) ────────────────────────────
// Sent at most once per day when the user has ≥1 unread message that
// hasn't been read on any device. Flag-gated behind
// EMAIL_MESSAGE_SUMMARY_ENABLED and Settings.messageEmailsEnabled.

import { chrome, escapeHtml, textShell, type RenderedEmail } from './render';

export interface MessageSummaryData {
  recipientName: string;
  unreadCount: number;
  topSenders?: string[]; // up to 3 display names
  inboxUrl?: string;
}

export function renderMessageSummary(data: MessageSummaryData): RenderedEmail {
  const you = escapeHtml(data.recipientName || 'there');
  const n = Math.max(0, Math.min(data.unreadCount ?? 0, 9999));
  const senders = (data.topSenders ?? []).slice(0, 3).map(s => escapeHtml(s));
  const url = data.inboxUrl || 'https://miamo.in/messages';

  const subject = n === 1
    ? `1 unread message on Miamo`
    : `${n} unread messages on Miamo`;

  const senderLine = senders.length > 0
    ? `<p style="margin:0 0 16px;line-height:1.6;font-size:15px;color:#7A746D;">From: ${senders.join(', ')}${senders.length === 3 ? ' + more' : ''}</p>`
    : '';

  const body = `<h2 style="margin:0 0 12px;font-size:22px;color:#2B1F17;">Hi ${you},</h2>
<p style="margin:0 0 16px;line-height:1.6;font-size:15px;">
You have <strong>${n} unread ${n === 1 ? 'message' : 'messages'}</strong> waiting.
</p>
${senderLine}
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#C97856;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">Open inbox</a></p>`;

  const text = textShell([
    `Hi ${data.recipientName || 'there'},`,
    `You have ${n} unread ${n === 1 ? 'message' : 'messages'} waiting.`,
    senders.length > 0 ? `From: ${senders.join(', ')}` : '',
    `Open inbox: ${url}`,
  ].filter(Boolean));

  return { subject, html: chrome({ preheader: `${n} unread on Miamo`, body }), text };
}
