// Miamo Mobile — Pure utilities. Mirrors services/web/src/lib/utils.ts.
// Every helper here is deterministic and side-effect-free so unit tests can
// exercise them without mocking.

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Human-readable time delta (e.g. "3d", "2h", "just now"). Mirrors web. */
export function timeAgo(iso: string | Date): string {
  const then = typeof iso === 'string' ? new Date(iso) : iso;
  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (isNaN(secs)) return '';
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return `${Math.floor(secs / 604800)}w`;
}

/** Truncate a string to `max` chars with an ellipsis. */
export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** Very light email validator — mirrors the web `services/web/src/lib/utils.ts`. */
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** India-shaped phone check (10 digits, optional +91). */
export function isIndianPhone(s: string): boolean {
  const digits = s.replace(/[^0-9]/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

/**
 * Format a numeric string as an Indian-style rupee amount, without paise.
 * "1234567" → "12,34,567".
 */
export function formatINR(n: number): string {
  const s = String(Math.floor(n));
  const lastThree = s.slice(-3);
  const rest = s.slice(0, -3);
  if (!rest) return lastThree;
  return `${rest.replace(/(\d)(?=(\d\d)+$)/g, '$1,')},${lastThree}`;
}

/** Compare two profiles' distances (km) for sorting; nulls sink. */
export function compareDistance(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/** Pick a stable initials pair from a display name. "Priya Rao" → "PR". */
export function initials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Basic Fisher-Yates shuffle — used for deck randomization in tests. */
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
