'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Check, Zap, MapPin, Heart, Cigarette, Wine,
  Dumbbell, GraduationCap, Dog, Baby, Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Filters, DEFAULT_FILTERS } from './constants';

export function FilterPanel({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void; filters: Filters;
  onApply: (f: Filters) => void;
}) {
  const [local, setLocal] = useState<Filters>(filters);
  useEffect(() => { if (isOpen) setLocal(filters); }, [isOpen, filters]);
  const set = (key: keyof Filters, val: any) => setLocal(p => ({ ...p, [key]: val }));
  const toggleChip = (key: keyof Filters, val: string) => {
    const current = (local[key] as string || '').split(',').filter(Boolean);
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    set(key, next.join(','));
  };
  const isChipActive = (key: keyof Filters, val: string) =>
    (local[key] as string || '').split(',').includes(val);

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={cn(
      'px-3.5 py-2 rounded-full text-[11px] font-semibold tracking-wide transition-all border',
      active
        ? 'bg-white text-gray-900 border-white shadow-[0_0_12px_rgba(236,64,122,0.15)] dark:bg-gray-700 dark:text-white dark:border-gray-600'
        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200',
    )}>
      {label}
    </button>
  );

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">{icon}{title}</h4>
      {children}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] max-w-[92vw] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">Filters</h3>
              <button onClick={() => setLocal(DEFAULT_FILTERS)} className="text-[11px] text-lavender-400 hover:text-gray-900 dark:hover:text-white transition-colors font-semibold">Reset</button>
            </div>
            <div className="px-6 py-6 space-y-7">
              <Section title="Quick Filters" icon={<Zap className="w-3 h-3 text-amber-400" />}>
                <div className="flex flex-wrap gap-2">
                  <Chip label="Active Today" active={local.activeToday} onClick={() => set('activeToday', !local.activeToday)} />
                  <Chip label="New Here" active={local.newHere} onClick={() => set('newHere', !local.newHere)} />
                  <Chip label="Verified" active={local.verified} onClick={() => set('verified', !local.verified)} />
                  <Chip label="Has Photos" active={local.hasPhotos} onClick={() => set('hasPhotos', !local.hasPhotos)} />
                </div>
              </Section>
              <Section title="Age Range" icon={<span className="text-[10px]">🎂</span>}>
                <div className="flex items-center gap-3">
                  <input type="number" value={local.minAge} onChange={e => set('minAge', parseInt(e.target.value) || 18)}
                    className="w-20 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-center text-sm focus:border-pink-200 focus:outline-none" min={18} max={99} />
                  <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">to</span>
                  <input type="number" value={local.maxAge} onChange={e => set('maxAge', parseInt(e.target.value) || 99)}
                    className="w-20 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-center text-sm focus:border-pink-200 focus:outline-none" min={18} max={99} />
                </div>
              </Section>
              <Section title="Height (cm)" icon={<span className="text-[10px]">📏</span>}>
                <div className="flex items-center gap-3">
                  <input type="number" value={local.minHeight || ''} onChange={e => set('minHeight', parseInt(e.target.value) || null)}
                    className="w-20 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-center text-sm focus:border-pink-200 focus:outline-none" placeholder="Min" />
                  <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">to</span>
                  <input type="number" value={local.maxHeight || ''} onChange={e => set('maxHeight', parseInt(e.target.value) || null)}
                    className="w-20 h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white text-center text-sm focus:border-pink-200 focus:outline-none" placeholder="Max" />
                </div>
              </Section>
              <Section title="City" icon={<MapPin className="w-3 h-3 text-blue-400" />}>
                <input value={local.city} onChange={e => set('city', e.target.value)}
                  className="w-full h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-4 text-sm focus:border-pink-200 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500" placeholder="Any city..." />
              </Section>
              <Section title="Show Me" icon={<span className="text-[10px]">👤</span>}>
                <div className="flex flex-wrap gap-2">
                  {['male', 'female', 'nonbinary'].map(g => (
                    <Chip key={g} label={g.charAt(0).toUpperCase() + g.slice(1)} active={isChipActive('genders', g)} onClick={() => toggleChip('genders', g)} />
                  ))}
                </div>
              </Section>
              <Section title="Sexuality" icon={<span className="text-[10px]">🌈</span>}>
                <div className="flex flex-wrap gap-2">
                  {['straight', 'gay', 'lesbian', 'bisexual', 'pansexual', 'queer'].map(s => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={isChipActive('sexualities', s)} onClick={() => toggleChip('sexualities', s)} />
                  ))}
                </div>
              </Section>
              <Section title="Looking For" icon={<Heart className="w-3 h-3 text-rose-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['long-term', 'short-term', 'casual', 'marriage', 'friendship', 'open'].map(l => (
                    <Chip key={l} label={l.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('lookingFor', l)} onClick={() => toggleChip('lookingFor', l)} />
                  ))}
                </div>
              </Section>
              <Section title="Smoking" icon={<Cigarette className="w-3 h-3 text-orange-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'sometimes', 'regularly'].map(s => (
                    <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} active={isChipActive('smoking', s)} onClick={() => toggleChip('smoking', s)} />
                  ))}
                </div>
              </Section>
              <Section title="Drinking" icon={<Wine className="w-3 h-3 text-purple-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'socially', 'regularly'].map(d => (
                    <Chip key={d} label={d.charAt(0).toUpperCase() + d.slice(1)} active={isChipActive('drinking', d)} onClick={() => toggleChip('drinking', d)} />
                  ))}
                </div>
              </Section>
              <Section title="Exercise" icon={<Dumbbell className="w-3 h-3 text-green-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['never', 'sometimes', 'active', 'very-active'].map(e => (
                    <Chip key={e} label={e.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('exercise', e)} onClick={() => toggleChip('exercise', e)} />
                  ))}
                </div>
              </Section>
              <Section title="Education" icon={<GraduationCap className="w-3 h-3 text-blue-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['high-school', 'bachelors', 'masters', 'phd'].map(e => (
                    <Chip key={e} label={e.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} active={isChipActive('education', e)} onClick={() => toggleChip('education', e)} />
                  ))}
                </div>
              </Section>
              <Section title="Pets" icon={<Dog className="w-3 h-3 text-amber-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['none', 'dog', 'cat', 'both', 'other'].map(p => (
                    <Chip key={p} label={p.charAt(0).toUpperCase() + p.slice(1)} active={isChipActive('pets', p)} onClick={() => toggleChip('pets', p)} />
                  ))}
                </div>
              </Section>
              <Section title="Children" icon={<Baby className="w-3 h-3 text-pink-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['none', 'have', 'want', 'maybe'].map(c => (
                    <Chip key={c} label={c.charAt(0).toUpperCase() + c.slice(1)} active={isChipActive('children', c)} onClick={() => toggleChip('children', c)} />
                  ))}
                </div>
              </Section>
              <Section title="Zodiac" icon={<Moon className="w-3 h-3 text-indigo-400" />}>
                <div className="flex flex-wrap gap-2">
                  {['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map(z => (
                    <Chip key={z} label={z} active={isChipActive('zodiac', z)} onClick={() => toggleChip('zodiac', z)} />
                  ))}
                </div>
              </Section>
              <Section title="Religion" icon={<span className="text-[10px]">🙏</span>}>
                <input value={local.religion} onChange={e => set('religion', e.target.value)}
                  className="w-full h-10 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 dark:bg-gray-800 dark:border-gray-700 dark:text-white px-4 text-sm focus:border-pink-200 focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500" placeholder="Any religion..." />
              </Section>
            </div>
            <div className="sticky bottom-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 p-5 flex gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">Cancel</button>
              <button onClick={() => { onApply(local); onClose(); }} className="flex-1 h-11 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold hover:bg-white/90 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Apply
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
