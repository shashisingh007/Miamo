'use client';
// v3.2 — Multi-select chip with icon per option, used for interests
// (sports, music, food, etc.). Falls back to a Tag icon if not mapped.
import { FieldIcon } from './FieldIcon';
import type { IconName } from '../../../shared/src/fieldMeta';

export interface IconChip {
  value: string;
  icon: IconName;
}

export function IconChipMulti({
  options, value, onChange, max, ariaLabel,
}: {
  options: IconChip[];
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  ariaLabel?: string;
}) {
  const has = (v: string) => value.includes(v);
  const toggle = (v: string) => {
    if (has(v)) onChange(value.filter(x => x !== v));
    else if (!max || value.length < max) onChange([...value, v]);
  };
  return (
    <div className="space-y-2" aria-label={ariaLabel}>
      <div className="flex flex-wrap gap-2">
        {options.map(o => {
          const active = has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(o.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                active
                  ? 'border-rose-main bg-rose-main/10 text-rose-main shadow-soft'
                  : 'border-token bg-miamo-card text-text-muted hover:border-rose-main/40'
              }`}
            >
              <FieldIcon name={o.icon} className={`h-3.5 w-3.5 ${active ? 'text-rose-main' : 'text-text-muted'}`} />
              {o.value}
            </button>
          );
        })}
      </div>
      {max ? (
        <p className="text-[11px] text-text-muted">{value.length}/{max} picked</p>
      ) : null}
    </div>
  );
}
