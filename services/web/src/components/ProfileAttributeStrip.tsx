'use client';
import { attributeListFor, type FieldMeta } from '../../../shared/src/fieldMeta';
import { FieldIcon } from './FieldIcon';

interface Props {
  kind: 'casual' | 'dtm';
  profile: Record<string, any>;
  max?: number;
  /** Render only fields belonging to specific groups (e.g. ['lifestyle']) */
  groups?: FieldMeta['group'][];
  className?: string;
  chipClassName?: string;
}

/**
 * v3.2 — Iconified attribute strip used by Discover ProfileCard and the
 * DTM card. Pulls icons + labels from the shared fieldMeta registry so a
 * single change there propagates everywhere.
 */
export function ProfileAttributeStrip({ kind, profile, max = 12, groups, className, chipClassName }: Props) {
  let items = attributeListFor(kind, profile);
  if (groups && groups.length) {
    items = items.filter(i => groups.includes(i.meta.group));
  }
  items = items.slice(0, max);
  if (!items.length) return null;
  return (
    <div className={className ?? 'flex flex-wrap gap-1.5'}>
      {items.map(({ meta, value }) => (
        <span
          key={meta.key}
          className={chipClassName ?? 'inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 text-[11px] text-text-muted ring-1 ring-black/[0.04]'}
          title={meta.label}
        >
          <FieldIcon name={meta.icon} className="h-3 w-3 text-brand-primary/80" />
          <span className="font-medium text-text-primary/80">{meta.label}:</span>
          <span className="truncate max-w-[140px]">{value}</span>
        </span>
      ))}
    </div>
  );
}
