// ─── Email template helpers (G.16) ─────────────────────────────────
//
// Pure functions used by every email template to render subject/html/text
// tuples deterministically. No I/O, no clock reads — templates stay unit-
// testable + audit-traceable.
//
// Feature flag: none — always on. Templates are inert until a mailer
// consumes them.

/** Escape user-supplied text before interpolating into HTML. */
export function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Wrap a template's body in the shared Miamo email chrome. */
export function chrome({ preheader, body }: { preheader: string; body: string }): string {
  const safePreheader = escapeHtml(preheader);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>Miamo</title></head>
<body style="margin:0;padding:0;background:#F7F2EC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2B1F17;">
<span style="display:none;font-size:1px;color:#F7F2EC;">${safePreheader}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#F7F2EC;padding:32px 16px;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="background:#ffffff;border-radius:16px;padding:32px;max-width:560px;">
<tr><td style="font-size:20px;font-weight:700;color:#C97856;padding-bottom:16px;">Miamo</td></tr>
<tr><td>${body}</td></tr>
<tr><td style="padding-top:24px;font-size:11px;color:#7A746D;line-height:1.5;">
You're receiving this because you have a Miamo account. Manage email preferences in Settings &rarr; Notifications.<br/>
Miamo, India. Made with care in Bengaluru.
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Render a plain-text mirror of a template body. Callers pass the raw text lines. */
export function textShell(lines: string[]): string {
  return `Miamo\n\n${lines.join('\n\n')}\n\n—\nManage email preferences: Settings > Notifications`;
}

export interface RenderedEmail { subject: string; html: string; text: string; }
