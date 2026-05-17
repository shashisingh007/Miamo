'use client';

/* ─── Shared Form Widgets for Serious Mode ─── */

export function Field({ label, icon: Icon, children, required }: { label: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-500 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label} {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition disabled:opacity-50" />
  );
}

export function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition appearance-none cursor-pointer">
      <option value="" className="bg-white text-zinc-400">{placeholder || 'Select...'}</option>
      {options.map(o => <option key={o} value={o} className="bg-white text-zinc-900">{o}</option>)}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400 outline-none transition resize-none" />
  );
}
