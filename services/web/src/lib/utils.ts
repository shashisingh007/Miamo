import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with `clsx` + `tailwind-merge`.
 * Handles conditional classes and resolves conflicting utility classes.
 *
 * @param inputs - Class values (strings, objects, arrays, conditionals)
 * @returns Merged class string with conflicts resolved
 *
 * @example
 * ```tsx
 * cn('px-2 py-1', isActive && 'bg-pink-500', 'px-4') // 'py-1 bg-pink-500 px-4'
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract up to 2 uppercase initials from a name.
 * Used for avatar fallback display when no photo is available.
 *
 * @param name - Full display name (e.g. "Jane Doe")
 * @returns Uppercase initials (e.g. "JD")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format a date as a human-friendly relative time string.
 *
 * @param date - Date string or Date object to format
 * @returns Relative string: "Just now", "5m ago", "3h ago", "2d ago", or locale date
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

/**
 * Truncate a string to a maximum length, appending an ellipsis if needed.
 *
 * @param str - String to truncate
 * @param len - Maximum length before truncation
 * @returns Original string or truncated with '…' suffix
 */
export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}
