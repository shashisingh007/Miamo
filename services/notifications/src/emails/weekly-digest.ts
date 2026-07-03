// ─── Weekly Top-10 digest email (G.16) ─────────────────────────────
// Sent Sunday evening — the WeeklyTopMatch ledger (per Phase F) has been
// computed, and each user gets a preview of their 10 best matches for the
// week. Flag-gated behind EMAIL_WEEKLY_DIGEST_ENABLED and
// Settings.weeklyDigestEmailsEnabled.

import { chrome, escapeHtml, textShell, type RenderedEmail } from './render';

export interface WeeklyDigestPick {
  displayName: string;
  cityHint?: string; // "Bengaluru" or approx per privacy
  compatibilityPct?: number; // 0..100
}

export interface WeeklyDigestData {
  recipientName: string;
  weekLabel: string; // "2026-W27"
  picks: WeeklyDigestPick[]; // up to 10
  discoverUrl?: string;
}

export function renderWeeklyDigest(data: WeeklyDigestData): RenderedEmail {
  const you = escapeHtml(data.recipientName || 'there');
  const week = escapeHtml(data.weekLabel || 'this week');
  const url = data.discoverUrl || 'https://miamo.app/discover';
  const picks = (data.picks ?? []).slice(0, 10);

  const subject = picks.length > 0
    ? `Your Miamo Top ${picks.length} for ${data.weekLabel || 'the week'}`
    : `Your Miamo week in review`;

  const rows = picks.map((p, i) => {
    const compat = typeof p.compatibilityPct === 'number'
      ? `<span style="color:#7A746D;font-size:13px;">${Math.round(Math.max(0, Math.min(p.compatibilityPct, 100)))}%</span>`
      : '';
    const city = p.cityHint ? `<span style="color:#7A746D;font-size:13px;">&middot; ${escapeHtml(p.cityHint)}</span>` : '';
    return `<tr>
<td style="padding:8px 0;font-size:14px;color:#2B1F17;">
<strong>${i + 1}.</strong> ${escapeHtml(p.displayName)} ${city} ${compat}
</td>
</tr>`;
  }).join('');

  const listBlock = picks.length > 0
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;border-top:1px solid #F0EBE4;">${rows}</table>`
    : `<p style="margin:16px 0;line-height:1.6;font-size:15px;color:#7A746D;">Your top list rebuilds every Monday — check back in a few days.</p>`;

  const body = `<h2 style="margin:0 0 12px;font-size:22px;color:#2B1F17;">${you}, here's your ${week} shortlist.</h2>
<p style="margin:0 0 8px;line-height:1.6;font-size:15px;">
Ten people the algorithm ranked highest for you this week. Chosen from behaviour, not just tags.
</p>
${listBlock}
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#C97856;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">See them in Discover</a></p>`;

  const text = textShell([
    `${data.recipientName || 'Hi'}, here's your ${data.weekLabel || 'weekly'} shortlist.`,
    ...picks.map((p, i) => `${i + 1}. ${p.displayName}${p.cityHint ? ' · ' + p.cityHint : ''}${typeof p.compatibilityPct === 'number' ? ' · ' + Math.round(p.compatibilityPct) + '%' : ''}`),
    picks.length === 0 ? 'Your top list rebuilds every Monday — check back in a few days.' : '',
    `See them in Discover: ${url}`,
  ].filter(Boolean));

  return { subject, html: chrome({ preheader: `Top ${Math.max(picks.length, 1)} for ${data.weekLabel || 'the week'}`, body }), text };
}
