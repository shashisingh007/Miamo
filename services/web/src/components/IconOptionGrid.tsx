'use client';
// v3.2 — selectable cards with icons + labels. Used for casual lifestyle
// (drinking/smoking/diet/etc.) and DTM partner prefs.
import { FieldIcon } from './FieldIcon';
import type { IconName } from '../../../shared/src/fieldMeta';

export interface IconOption {
  value: string;
  label: string;
  icon: IconName;
}

export function IconOptionGrid({
  options, value, onChange, columns = 3, ariaLabel,
}: {
  options: IconOption[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3 | 4;
  ariaLabel?: string;
}) {
  const cols = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[columns];
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`grid gap-2 ${cols}`}>
      {options.map(o => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`group flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-3 text-[12px] font-medium transition ${
              active
                ? 'border-rose-main bg-rose-main/10 text-rose-main shadow-soft'
                : 'border-token bg-miamo-card text-text-secondary hover:border-rose-main/40'
            }`}
          >
            <FieldIcon
              name={o.icon}
              className={`h-5 w-5 transition ${active ? 'text-rose-main' : 'text-text-muted group-hover:text-rose-main/70'}`}
            />
            <span className="capitalize leading-tight text-center">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
