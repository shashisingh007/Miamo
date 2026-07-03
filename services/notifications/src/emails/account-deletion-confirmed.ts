// ─── Account-deletion confirmation email (G.16) ────────────────────
// Sent immediately after a RTBF (right-to-be-forgotten) request completes.
// This email is legally-required (DPDP Section 12(1) — user must receive
// confirmation of processing). Never flag-gated off.
//
// Cross-refs:
//   - docs/legal/privacy-policy.md
//   - services/users/src/server.ts (POST /api/v1/settings/delete-account)

import { chrome, escapeHtml, textShell, type RenderedEmail } from './render';

export interface AccountDeletionData {
  displayName: string;
  deletionRequestId: string; // shown so the user can reference it if they contact support
  deletedAt: string; // ISO-8601 UTC
}

export function renderAccountDeletionConfirmed(data: AccountDeletionData): RenderedEmail {
  const name = escapeHtml(data.displayName || 'there');
  const rid = escapeHtml(data.deletionRequestId || 'unknown');
  const at = escapeHtml(data.deletedAt || new Date().toISOString());
  const subject = `Your Miamo account has been deleted`;

  const body = `<h2 style="margin:0 0 12px;font-size:22px;color:#2B1F17;">${name}, your account has been deleted.</h2>
<p style="margin:0 0 12px;line-height:1.6;font-size:15px;">
Every row we held that referenced you — your profile, photos, likes, matches, messages, and tracking hashes — has been permanently removed. This action is irreversible.
</p>
<p style="margin:0 0 12px;line-height:1.6;font-size:15px;">
A limited set of records is retained where the law requires: audit-log entries related to your deletion request itself, and any transaction receipts for previous premium purchases (7 years, per the Indian Income-Tax Act).
</p>
<p style="margin:0 0 16px;line-height:1.6;font-size:15px;color:#7A746D;">
Request ID: <code>${rid}</code><br/>
Deleted at: ${at}
</p>
<p style="margin:0;line-height:1.6;font-size:14px;color:#7A746D;">
Questions? Reply to this email and a human will respond within 48 hours.
</p>`;

  const text = textShell([
    `${data.displayName || 'Hi'}, your account has been deleted.`,
    `Every row we held that referenced you — profile, photos, likes, matches, messages, tracking hashes — has been permanently removed. This action is irreversible.`,
    `A limited set of records is retained where the law requires: audit-log entries related to your deletion request itself, and any transaction receipts for previous premium purchases (7 years, per the Indian Income-Tax Act).`,
    `Request ID: ${data.deletionRequestId || 'unknown'}`,
    `Deleted at: ${data.deletedAt || new Date().toISOString()}`,
    `Questions? Reply to this email and a human will respond within 48 hours.`,
  ]);

  return { subject, html: chrome({ preheader: 'Confirmation of Miamo account deletion.', body }), text };
}
