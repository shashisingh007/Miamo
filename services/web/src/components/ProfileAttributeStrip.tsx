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
  /** v3.3 — colourful per-field accents. Defaults to true. */
  colourful?: boolean;
}

// v3.3 — soft pastel palette per field key. Tailwind classes are static
// strings so the JIT compiler picks them up. Each tone uses a tinted
// background, matching ring, and a darker icon/text accent so the strip
// reads like a classy infographic rather than a wall of grey chips.
type Tone = { chip: string; icon: string };
const TONES: Record<string, Tone> = {
  rose:    { chip: 'bg-rose-50 text-rose-900 ring-rose-200/70',          icon: 'text-rose-500' },
  amber:   { chip: 'bg-amber-50 text-amber-900 ring-amber-200/70',       icon: 'text-amber-600' },
  emerald: { chip: 'bg-emerald-50 text-emerald-900 ring-emerald-200/70', icon: 'text-emerald-600' },
  sky:     { chip: 'bg-sky-50 text-sky-900 ring-sky-200/70',             icon: 'text-sky-600' },
  violet:  { chip: 'bg-violet-50 text-violet-900 ring-violet-200/70',    icon: 'text-violet-600' },
  fuchsia: { chip: 'bg-fuchsia-50 text-fuchsia-900 ring-fuchsia-200/70', icon: 'text-fuchsia-600' },
  cyan:    { chip: 'bg-cyan-50 text-cyan-900 ring-cyan-200/70',          icon: 'text-cyan-600' },
  lime:    { chip: 'bg-lime-50 text-lime-900 ring-lime-200/70',          icon: 'text-lime-700' },
  orange:  { chip: 'bg-orange-50 text-orange-900 ring-orange-200/70',    icon: 'text-orange-600' },
  indigo:  { chip: 'bg-indigo-50 text-indigo-900 ring-indigo-200/70',    icon: 'text-indigo-600' },
  slate:   { chip: 'bg-slate-50 text-slate-800 ring-slate-200/70',       icon: 'text-slate-600' },
};

const KEY_TONE: Record<string, keyof typeof TONES> = {
  age: 'rose', gender: 'fuchsia', city: 'sky', profession: 'amber',
  bio: 'slate', height: 'indigo', sexuality: 'rose',
  education: 'violet', languages: 'cyan', diet: 'emerald',
  drinking: 'orange', smoking: 'slate', exercise: 'lime',
  religion: 'fuchsia', pets: 'amber', children: 'rose',
  zodiac: 'violet', lookingFor: 'rose', politicalViews: 'slate',
  verification: 'emerald',
  // dtm extras
  caste: 'amber', maritalStatus: 'rose', motherTongue: 'cyan',
  occupation: 'amber', company: 'amber', annualIncome: 'emerald',
  workingCity: 'sky', workingCountry: 'sky',
  fatherName: 'slate', motherName: 'slate', brothers: 'slate', sisters: 'slate',
  familyType: 'amber', familyStatus: 'amber', familyValues: 'fuchsia',
  manglik: 'orange', nakshatra: 'violet', raasi: 'violet',
  bloodGroup: 'rose', complexion: 'amber', bodyType: 'indigo',
};

function toneFor(key: string): Tone {
  const name = KEY_TONE[key] ?? 'slate';
  return TONES[name];
}

/**
 * v3.3 — Iconified attribute strip. By default each chip is colour-tinted
 * by field key for a classy, scannable look. Pass `colourful={false}` or a
 * custom `chipClassName` to fall back to a uniform style.
 */
export function ProfileAttributeStrip({ kind, profile, max = 12, groups, className, chipClassName, colourful = true }: Props) {
  let items = attributeListFor(kind, profile);
  if (groups && groups.length) {
    items = items.filter(i => groups.includes(i.meta.group));
  }
  items = items.slice(0, max);
  if (!items.length) return null;
  const useTones = colourful && !chipClassName;
  return (
    <div className={className ?? 'flex flex-wrap gap-1.5'}>
      {items.map(({ meta, value }) => {
        const tone = useTones ? toneFor(meta.key) : null;
        const baseChip = chipClassName
          ?? (tone
            ? `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ${tone.chip}`
            : 'inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 text-[11px] text-text-muted ring-1 ring-black/[0.04]');
        const iconCls = tone ? `h-3.5 w-3.5 ${tone.icon}` : 'h-3 w-3 text-brand-primary/80';
        return (
          <span key={meta.key} className={baseChip} title={meta.label}>
            <FieldIcon name={meta.icon} className={iconCls} />
            <span className="font-semibold opacity-80">{meta.label}:</span>
            <span className="truncate max-w-[140px]">{value}</span>
          </span>
        );
      })}
    </div>
  );
}
