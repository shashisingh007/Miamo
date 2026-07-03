'use client';
import * as Lucide from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { IconName } from '../../../shared/src/fieldMeta';

// Single mapping from string icon name (kept in the shared, React-free
// fieldMeta registry) → live lucide-react component. Only icons used by
// fieldMeta are exposed; anything missing falls back to <Tag>.
const ICONS: Record<string, LucideIcon> = Lucide as unknown as Record<string, LucideIcon>;

export function FieldIcon({ name, className = 'h-4 w-4' }: { name: IconName | string; className?: string }) {
  const Cmp = ICONS[name] ?? Lucide.Tag;
  return <Cmp className={className} aria-hidden="true" />;
}
