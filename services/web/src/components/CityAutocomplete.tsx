'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';

interface City { name: string; region: string; country: string; display: string; lat?: number; lng?: number; population?: number }
interface Props {
  value: string;
  onChange: (display: string, city?: City) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

// Debounced typeahead. Calls /api/v1/cities/search after 150ms of inactivity
// once the input has at least 1 character. Mouse + keyboard navigation.
export function CityAutocomplete({ value, onChange, placeholder = 'Start typing your city…', className, required }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<City[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setQuery(value); }, [value]);

  // Recompute dropdown position when open / on scroll / resize
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      const r = inputRef.current!.getBoundingClientRect();
      setRect({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = (query || '').trim();
    if (trimmed.length < 1) { setResults([]); setOpen(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.searchCities(trimmed);
        setResults(r.data || []);
        setHighlight(0);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(target)) {
        // Also ignore clicks inside the portal dropdown (data-city-dropdown)
        const inDropdown = (target as HTMLElement)?.closest?.('[data-city-dropdown]');
        if (!inDropdown) setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (c: City) => {
    setQuery(c.display);
    onChange(c.display, c);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className || ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
          else if (e.key === 'Enter' && results[highlight]) { e.preventDefault(); choose(results[highlight]); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="w-full px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
      />
      {loading && (<div className="absolute right-3 top-2.5 text-xs text-neutral-400">…</div>)}
      {mounted && open && results.length > 0 && rect && createPortal(
        <ul
          data-city-dropdown
          style={{ position: 'fixed', left: rect.left, top: rect.top, width: rect.width, zIndex: 200 }}
          className="max-h-72 overflow-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg"
        >
          {results.map((c, i) => (
            <li
              key={`${c.name}-${c.region}-${c.country}-${i}`}
              onMouseDown={(e) => { e.preventDefault(); choose(c); }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-4 py-2 cursor-pointer text-sm ${i === highlight ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}
            >
              <span className="font-medium">{c.name}</span>
              <span className="text-neutral-500"> · {c.region ? `${c.region}, ` : ''}{c.country}</span>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
