// ─── Activation-email schedule loop (G.18) ─────────────────────────
//
// Purpose: a lightweight recurring loop that ticks every 5 minutes and
// enqueues activation-email notifications at four hard-coded touchpoints
// after signup: 0h (welcome), 24h (complete-your-profile), 48h (unread
// matches nudge), and day-7 (algorithm-tips digest).
//
// The loop is idempotent — the `AuditLog` writes tagged
// `activation-email:<touchpoint>` are the source of truth for "already
// sent to this user". Restarting the worker on any deploy day cannot
// double-send.
//
// Feature flag: `FEATURE_ACTIVATION_EMAILS_ENABLED=1`. Off (default) =
// `start()` is a no-op; `tick()` returns 0 without any DB reads.
//
// Cross-refs:
//   - services/notifications/src/emails/welcome.ts (0h template)
//   - docs/architecture/activation-funnel.md
//   - services/tracking-worker/src/index.ts (registration site)

import type { PrismaClient } from '@prisma/client';

export type Touchpoint = 'welcome' | 'complete-profile' | 'unread-matches' | 'algorithm-tips';

/** Hours after signup that each touchpoint fires. Read by tests. */
export const TOUCHPOINT_SCHEDULE: Record<Touchpoint, number> = {
  welcome: 0,
  'complete-profile': 24,
  'unread-matches': 48,
  'algorithm-tips': 24 * 7,
};

const INTERVAL_MS = Number(process.env.ACTIVATION_EMAIL_INTERVAL_MS || 5 * 60 * 1000);
const BATCH = Number(process.env.ACTIVATION_EMAIL_BATCH || 100);
/**
 * How wide is the "fire now" window either side of the touchpoint
 * timestamp? The loop ticks every INTERVAL_MS (5 min default); the
 * window MUST be ≥ INTERVAL_MS or we'll skip users whose signup falls
 * between ticks. We use 2 × INTERVAL_MS for safety, and the audit-log
 * dedupe guarantees no double-send even if a user's signup timestamp
 * falls in the overlap of two consecutive ticks.
 */
const WINDOW_MS = INTERVAL_MS * 2;

/**
 * Pure schedule helper. Given `signupAt` and `now`, return the list of
 * touchpoints that should have fired by `now` but haven't yet.
 * Deterministic — safe to unit-test with no DB.
 */
export function dueTouchpoints(signupAt: Date, now: Date, alreadySent: Set<Touchpoint>): Touchpoint[] {
  const ageMs = now.getTime() - signupAt.getTime();
  const due: Touchpoint[] = [];
  for (const [tp, hours] of Object.entries(TOUCHPOINT_SCHEDULE) as Array<[Touchpoint, number]>) {
    if (alreadySent.has(tp)) continue;
    const dueAtMs = hours * 60 * 60 * 1000;
    // Fire when the user has aged past the schedule and is within the
    // WINDOW_MS window on the "before" side (avoid firing 30 days late).
    if (ageMs >= dueAtMs && ageMs <= dueAtMs + WINDOW_MS + 24 * 60 * 60 * 1000) {
      due.push(tp);
    }
  }
  return due;
}

export function isActivationEmailsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FEATURE_ACTIVATION_EMAILS_ENABLED === '1';
}

/**
 * Loop worker. Follows the same shape as the other tracking-worker
 * loops (start/stop/tick + a timer handle).
 */
export class ActivationEmailsLoop {
  private timer: NodeJS.Timeout | null = null;
  private lastTickAt: Date | null = null;
  private counters = { enqueued: 0, checked: 0, errors: 0 };

  constructor(private prisma: PrismaClient) {}

  isEnabled(): boolean { return isActivationEmailsEnabled(); }

  status(): { enabled: boolean; lastTickAt: string | null; counters: { enqueued: number; checked: number; errors: number } } {
    return { enabled: this.isEnabled(), lastTickAt: this.lastTickAt?.toISOString() ?? null, counters: this.counters };
  }

  start(): void {
    if (!this.isEnabled()) return;
    if (this.timer) return;
    // Stagger the first run by 30s so the worker doesn't thrash on boot.
    this.timer = setTimeout(() => {
      void this.tick();
      this.timer = setInterval(() => { void this.tick(); }, INTERVAL_MS);
    }, 30_000);
  }

  stop(): void {
    if (this.timer) { clearTimeout(this.timer); clearInterval(this.timer); this.timer = null; }
  }

  /**
   * Scan recent users, compute which touchpoints are due, and enqueue
   * the notification rows. Returns the count enqueued this tick.
   * Idempotent per (userId, touchpoint) via AuditLog dedup.
   */
  async tick(now: Date = new Date()): Promise<number> {
    if (!this.isEnabled()) return 0;
    this.lastTickAt = now;
    let enqueued = 0;
    try {
      // Look at every user whose signup is within the last 8 days —
      // the widest touchpoint (day-7) needs a slight buffer.
      const since = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
      const users = await this.prisma.user.findMany({
        where: { createdAt: { gte: since }, deactivated: false, active: true },
        select: { id: true, createdAt: true, displayName: true },
        take: BATCH,
        orderBy: { createdAt: 'desc' },
      });
      for (const u of users) {
        this.counters.checked++;
        // Existing sends — read the audit trail for this user's
        // 'activation-email:*' entries.
        const prior = await this.prisma.auditLog.findMany({
          where: { userId: u.id, action: { startsWith: 'activation-email:' } },
          select: { action: true },
        });
        const alreadySent = new Set<Touchpoint>(
          (prior as Array<{ action: string }>).map((p) => p.action.replace('activation-email:', '') as Touchpoint),
        );
        const due = dueTouchpoints(u.createdAt, now, alreadySent);
        for (const tp of due) {
          try {
            // Create the audit-log row FIRST so a concurrent worker
            // sees this touchpoint as sent and doesn't duplicate.
            await this.prisma.auditLog.create({
              data: { userId: u.id, action: `activation-email:${tp}`, details: JSON.stringify({ scheduledFor: now.toISOString() }) },
            });
            // Enqueue the actual notification row — the notifications
            // service's Notification table doubles as the outbound
            // email/push work-queue; the email worker (G.16 future work)
            // consumes rows where type='email-activation'.
            await this.prisma.notification.create({
              data: {
                userId: u.id,
                type: 'email-activation',
                title: activationTitle(tp),
                body: activationBody(tp, u.displayName ?? ''),
                data: JSON.stringify({ touchpoint: tp, template: templateForTouchpoint(tp) }),
              },
            });
            enqueued++;
            this.counters.enqueued++;
          } catch {
            this.counters.errors++;
          }
        }
      }
    } catch {
      this.counters.errors++;
    }
    return enqueued;
  }
}

// ─── Copy strings for each touchpoint. Kept inline (no I/O) so the pure
//     schedule helper stays unit-testable in isolation.

export function activationTitle(tp: Touchpoint): string {
  switch (tp) {
    case 'welcome': return 'Welcome to Miamo';
    case 'complete-profile': return 'Add a few finishing touches';
    case 'unread-matches': return 'Your matches are waiting';
    case 'algorithm-tips': return 'How the Miamo algorithm sees you';
  }
}

export function activationBody(tp: Touchpoint, displayName: string): string {
  const name = displayName || 'there';
  switch (tp) {
    case 'welcome': return `Welcome, ${name}. Your Discover queue is ready — come see who we picked.`;
    case 'complete-profile': return `Hi ${name}. Profiles with 3+ photos and 2+ prompts get 4x more Moves. Two minutes of polish goes a long way.`;
    case 'unread-matches': return `${name}, a few people are hoping you write first. The first Move is the whole game.`;
    case 'algorithm-tips': return `${name}, here's how Miamo ranks you higher: chat back within 24h, add specificity to prompts, and pass thoughtfully (feedback tunes the queue).`;
  }
}

export function templateForTouchpoint(tp: Touchpoint): string {
  switch (tp) {
    case 'welcome': return 'welcome';
    case 'complete-profile': return 'complete-profile';
    case 'unread-matches': return 'unread-matches';
    case 'algorithm-tips': return 'algorithm-tips';
  }
}
