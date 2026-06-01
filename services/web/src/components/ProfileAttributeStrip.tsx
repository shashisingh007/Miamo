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
  /** When provided, every chip uses this className verbatim (legacy mode). */
  chipClassName?: string;
  /**
   * v3.4 — visual variant.
   *   'chips' (default): a single classy warm-cream chip palette with
   *                       copper/rose icon accents. Reads royal, not noisy.
   *   'rows':            a 2-column specification panel with hairline
   *                       dividers — best for the Discover ProfileCard.
   */
  variant?: 'chips' | 'rows';
}

/**
 * v3.4 — Iconified attribute strip used by Discover ProfileCard, the DTM
 * card, and onboarding. Pulls icons + labels from the shared fieldMeta
 * registry so a single change there propagates everywhere.
 *
 * Royal/rich aesthetic: a single restrained palette (warm cream chip,
 * copper hairlines, rose icons) instead of a rainbow of pastels. The
 * `variant="rows"` mode renders a luxury spec-sheet grid.
 */
export function ProfileAttributeStrip({
  kind, profile, max = 12, groups, className, chipClassName, variant = 'chips',
}: Props) {
  let items = attributeListFor(kind, profile);
  if (groups && groups.length) {
    items = items.filter(i => groups.includes(i.meta.group));
  }
  items = items.slice(0, max);
  if (!items.length) return null;

  if (variant === 'rows') {
    return (
      <div className={className ?? 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0 rounded-2xl bg-gradient-to-br from-[#FBF7F2] to-[#F6EFE7] ring-1 ring-[#E9DCC9]/70 px-5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'}>
        {items.map(({ meta, value }, i) => (
          <div
            key={meta.key}
            className="group flex items-center gap-3 py-2.5 border-b border-[#E9DCC9]/50 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            title={meta.label}
          >
            <span className="w-7 h-7 rounded-full bg-white/80 ring-1 ring-[#E9DCC9] flex items-center justify-center shrink-0">
              <FieldIcon name={meta.icon} className="h-3.5 w-3.5 text-[#B86A4A]" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 w-[88px] shrink-0">
              {meta.label}
            </span>
            <span className="text-[13px] font-medium text-stone-800 truncate">{value}</span>
          </div>
        ))}
      </div>
    );
  }

  // Default: classy single-tone chips (warm cream, copper accent).
  const baseChip = chipClassName
    ?? 'inline-flex items-center gap-2 rounded-full bg-[#FBF7F2] ring-1 ring-[#E9DCC9]/70 px-3 py-1.5 text-[12px] text-stone-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]';
  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      {items.map(({ meta, value }) => (
        <span key={meta.key} className={baseChip} title={meta.label}>
          <FieldIcon name={meta.icon} className="h-3.5 w-3.5 text-[#B86A4A]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{meta.label}</span>
          <span className="font-medium text-stone-800 truncate max-w-[140px]">{value}</span>
        </span>
      ))}
    </div>
  );
}
