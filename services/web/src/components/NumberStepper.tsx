'use client';
// v3.2 — Friendly number stepper + slider combo for height (cm), weight
// (kg), age etc. — replaces raw <input type="number"> in onboarding.
import { Minus, Plus } from 'lucide-react';

export function NumberStepper({
  value, onChange, min, max, step = 1, suffix, label, ariaLabel,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  label?: string;
  ariaLabel?: string;
}) {
  const v = typeof value === 'number' && !isNaN(value) ? value : min;
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const pct = ((v - min) / (max - min)) * 100;
  return (
    <div className="w-full" role="group" aria-label={ariaLabel ?? label}>
      {label ? <div className="mb-1 text-xs font-medium text-text-secondary">{label}</div> : null}
      <div className="flex items-center gap-2 rounded-2xl border border-token bg-miamo-card px-2 py-2">
        <button type="button" aria-label="decrease" onClick={() => onChange(clamp(v - step))}
          className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.04] text-text-secondary hover:bg-rose-main/10 hover:text-rose-main">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 text-center">
          <div className="text-base font-semibold tabular-nums text-text-primary">
            {v}{suffix ? <span className="ml-0.5 text-xs font-normal text-text-muted">{suffix}</span> : null}
          </div>
        </div>
        <button type="button" aria-label="increase" onClick={() => onChange(clamp(v + step))}
          className="grid h-8 w-8 place-items-center rounded-full bg-black/[0.04] text-text-secondary hover:bg-rose-main/10 hover:text-rose-main">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={v}
        onChange={e => onChange(clamp(parseInt(e.target.value) || min))}
        className="mt-2 w-full accent-rose-main"
        style={{ background: `linear-gradient(to right, var(--rose-main, #e85d75) 0% ${pct}%, rgba(0,0,0,0.06) ${pct}% 100%)` }}
      />
      <div className="mt-0.5 flex justify-between text-[10px] text-text-muted tabular-nums">
        <span>{min}{suffix ?? ''}</span><span>{max}{suffix ?? ''}</span>
      </div>
    </div>
  );
}

/** Height picker that returns inches int (DTM uses string like 5'10") */
export function HeightPickerCm({ value, onChange }: { value: number | undefined; onChange: (cm: number) => void }) {
  const cm = typeof value === 'number' ? value : 165;
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return (
    <div>
      <NumberStepper value={cm} onChange={onChange} min={140} max={210} step={1} suffix=" cm" label="Height" />
      <p className="mt-1 text-[11px] text-text-muted">≈ {ft}&apos;{inch}&quot;</p>
    </div>
  );
}
