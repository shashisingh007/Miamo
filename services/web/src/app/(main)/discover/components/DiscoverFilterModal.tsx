'use client';

/* ─── Discover Filter Modal ──────────────────────────────────────────────
 * UI/UX mirror of the DTM "Refine matches" modal in
 * services/web/src/app/(main)/serious-mode/page.tsx (centered overlay,
 * scroll-locked body, FilterSection grid of FilterField cells, sticky
 * apply/reset footer). Categories swapped for Discover (casual) fields:
 * Essentials, Identity & Intent, Lifestyle, Background, Personality,
 * Interests & Vibe, Dating prefs, Quality toggles.
 * ───────────────────────────────────────────────────────────────────── */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/app/(main)/serious-mode/components/FormWidgets';
import { type Filters, DEFAULT_FILTERS } from './constants';
import {
  GENDER_OPTIONS, SEXUALITY_OPTIONS, LOOKING_FOR_OPTIONS, SMOKING_OPTIONS,
  DRINKING_OPTIONS, EXERCISE_OPTIONS, DIET_OPTIONS, EDUCATION_OPTIONS,
  PETS_OPTIONS, CHILDREN_OPTIONS, RELIGION_OPTIONS, POLITICS_OPTIONS,
  ZODIAC_OPTIONS, LANGUAGE_OPTIONS, MARITAL_STATUS_OPTIONS, INCOME_BAND_OPTIONS,
  type Option,
} from '@/lib/profileOptions';

/* ─── Inline option lists (only used by Discover, not in profileOptions) ── */
const HOBBY_OPTIONS: Option[] = [
  ['reading','Reading'],['writing','Writing'],['travel','Travel'],['photography','Photography'],
  ['cooking','Cooking'],['baking','Baking'],['painting','Painting'],['singing','Singing'],
  ['dancing','Dancing'],['gaming','Gaming'],['gym','Gym'],['yoga','Yoga'],
  ['running','Running'],['cycling','Cycling'],['hiking','Hiking'],['climbing','Climbing'],
  ['martial-arts','Martial arts'],['meditation','Meditation'],['volunteering','Volunteering'],
  ['gardening','Gardening'],['movies','Movies/TV'],['theatre','Theatre'],['standup','Stand-up'],
  ['concerts','Concerts'],['museums','Museums'],['cars','Cars/Bikes'],['tech','Tech'],
  ['investing','Investing'],['astrology','Astrology'],['foodie','Foodie'],
].map(([value,label])=>({value,label}));
const MUSIC_OPTIONS: Option[] = [
  ['pop','Pop'],['rock','Rock'],['indie','Indie'],['metal','Metal'],['rnb','R&B'],
  ['hiphop','Hip-hop'],['edm','EDM'],['jazz','Jazz'],['classical','Classical'],
  ['hindustani','Hindustani'],['carnatic','Carnatic'],['bollywood','Bollywood'],
  ['sufi','Sufi'],['ghazal','Ghazal'],['punjabi','Punjabi'],['kpop','K-pop'],
  ['latin','Latin'],['country','Country'],['folk','Folk'],['lofi','Lo-fi'],['devotional','Devotional'],
].map(([value,label])=>({value,label}));
const MOVIE_OPTIONS: Option[] = [
  ['action','Action'],['comedy','Comedy'],['drama','Drama'],['romance','Romance'],
  ['romcom','Rom-com'],['thriller','Thriller'],['horror','Horror'],['mystery','Mystery'],
  ['scifi','Sci-fi'],['fantasy','Fantasy'],['anime','Anime'],['animation','Animation'],
  ['documentary','Documentary'],['biopic','Biopic'],['crime','Crime'],['arthouse','Arthouse'],
  ['bollywood','Bollywood'],['kdrama','K-drama'],['sitcom','Sitcom'],
].map(([value,label])=>({value,label}));
const FITNESS_OPTIONS: Option[] = [
  ['athlete','Athlete'],['active','Active'],['moderate','Moderate'],['light','Light'],['sedentary','Sedentary'],
].map(([value,label])=>({value,label}));
const ATTACHMENT_OPTIONS: Option[] = [
  ['secure','Secure'],['anxious','Anxious'],['avoidant','Avoidant'],['fearful-avoidant','Fearful-avoidant'],['mixed','Mixed/unsure'],
].map(([value,label])=>({value,label}));
const LOVE_LANG_OPTIONS: Option[] = [
  ['words','Words'],['acts','Acts of service'],['gifts','Gifts'],['time','Quality time'],['touch','Physical touch'],
].map(([value,label])=>({value,label}));
const COMM_OPTIONS: Option[] = [
  ['direct','Direct'],['diplomatic','Diplomatic'],['reserved','Reserved'],['expressive','Expressive'],['thoughtful','Thoughtful'],
].map(([value,label])=>({value,label}));
const CONFLICT_OPTIONS: Option[] = [
  ['discuss','Discuss'],['space-then-talk','Space, then talk'],['avoid','Avoid'],['compromise','Compromise'],['mediate','Mediate'],
].map(([value,label])=>({value,label}));
const SOCIAL_OPTIONS: Option[] = [
  ['introvert','Introvert'],['extrovert','Extrovert'],['ambivert','Ambivert'],['homebody','Homebody'],['social-butterfly','Social butterfly'],
].map(([value,label])=>({value,label}));
const INTRO_EXTRO_OPTIONS: Option[] = [
  ['introvert','Introvert'],['leans-introvert','Leans introvert'],['ambivert','Ambivert'],['leans-extrovert','Leans extrovert'],['extrovert','Extrovert'],
].map(([value,label])=>({value,label}));
const MBTI_OPTIONS: Option[] = ['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map(v=>({value:v,label:v}));
const ENNEAGRAM_OPTIONS: Option[] = ['1','2','3','4','5','6','7','8','9'].map(v=>({value:v,label:`Type ${v}`}));
const DATING_EXP_OPTIONS: Option[] = [
  ['first-time','First time'],['casual','Some casual'],['few-relationships','A few'],['many','Many'],['returning','Returning'],
].map(([value,label])=>({value,label}));
const DATING_INTENT_OPTIONS: Option[] = [
  ['serious-only','Serious only'],['serious-leaning','Serious-leaning'],['open','Open'],
  ['casual-leaning','Casual-leaning'],['casual-only','Casual only'],['figuring-out','Figuring out'],
].map(([value,label])=>({value,label}));
const KIDS_TIMELINE_OPTIONS: Option[] = [
  ['0-2y','Within 2y'],['2-5y','2 – 5y'],['5y+','5+ years'],['someday','Someday'],['never','Never'],
].map(([value,label])=>({value,label}));
const WANTS_KIDS_OPTIONS: Option[] = [
  ['definitely','Definitely'],['someday','Someday'],['open','Open'],['not-sure','Not sure'],['no','No'],['have','Already have'],
].map(([value,label])=>({value,label}));
const LIVING_OPTIONS: Option[] = [
  ['alone','Alone'],['roommates','Roommates'],['partner','With partner'],['parents','With parents'],
  ['kids','With kids'],['pg','PG/Hostel'],['travel','Nomad'],
].map(([value,label])=>({value,label}));
const TRAVEL_OPTIONS: Option[] = [
  ['backpacker','Backpacker'],['luxury','Luxury'],['budget','Budget'],['cultural','Cultural'],
  ['beach','Beach'],['mountains','Mountains'],['roadtrip','Road trips'],['solo','Solo'],
  ['group','Group'],['foodie','Foodie'],['spiritual','Spiritual'],['workation','Workation'],['homebody','Homebody'],
].map(([value,label])=>({value,label}));
const NIGHTLIFE_OPTIONS: Option[] = [
  ['love-it','Love it'],['sometimes','Sometimes'],['rare','Rare'],['not-my-thing','Not my thing'],
].map(([value,label])=>({value,label}));
const SOCIAL_MEDIA_OPTIONS: Option[] = [
  ['addict','Always online'],['active','Active'],['casual','Casual'],['lurker','Lurker'],
  ['minimal','Minimal'],['off-grid','Off-grid'],
].map(([value,label])=>({value,label}));

/* ─── Modal ───────────────────────────────────────────────────────────── */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filters: Filters;
  onApply: (next: Filters) => void;
}

export function DiscoverFilterModal({ isOpen, onClose, filters, onApply }: Props) {
  // Defer the portal-style overlay until after mount to guarantee SSR HTML
  // and first client paint match (mirrors the old FilterPanel's pattern).
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Mirror DTM behaviour: every change is committed immediately so the deck
  // reflects the latest selection. The "Apply" button just closes the modal.
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onApply({ ...filters, [key]: value });
  };
  const setStr = (key: keyof Filters) => (v: string) => set(key, v as never);
  const toggleBool = (key: keyof Filters) => () => set(key, (!filters[key]) as never);
  const setNum = (key: keyof Filters, fallback: number | null) => (v: string) =>
    set(key, (v ? Number(v) : fallback) as never);

  // Esc + body scroll-lock (same as DTM modal)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [isOpen, onClose]);

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'minAge' && v === 18) return false;
    if (k === 'maxAge' && v === 99) return false;
    if (k === 'distance' && v === 50) return false;
    return v !== '' && v !== null && v !== false;
  }).length;

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-[72px] px-3 pb-3 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ duration: 0.18 }}
            className="relative pointer-events-auto w-[min(96vw,1100px)] max-h-[calc(100vh-96px)]"
          >
            <div
              className="bg-miamo-card rounded-2xl border border-zinc-200 shadow-2xl flex flex-col h-full overflow-hidden"
              style={{ maxHeight: 'calc(100vh - 96px)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-white/80 backdrop-blur-md shrink-0">
                <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-rose-main" />
                  Refine Discover
                  {activeCount > 0 && (
                    <span className="ml-1 px-2 h-5 inline-flex items-center rounded-full bg-rose-main text-white text-[10px] font-bold">
                      {activeCount} active
                    </span>
                  )}
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto p-5 space-y-5 flex-1">
                <FilterSection title="Essentials">
                  <FilterField label="Min Age">
                    <Input type="number" value={String(filters.minAge ?? '')} onChange={setNum('minAge', 18)} placeholder="18" />
                  </FilterField>
                  <FilterField label="Max Age">
                    <Input type="number" value={String(filters.maxAge ?? '')} onChange={setNum('maxAge', 99)} placeholder="99" />
                  </FilterField>
                  <FilterField label="Min Height (cm)">
                    <Input type="number" value={filters.minHeight ? String(filters.minHeight) : ''} onChange={setNum('minHeight', null)} placeholder="e.g. 150" />
                  </FilterField>
                  <FilterField label="Max Height (cm)">
                    <Input type="number" value={filters.maxHeight ? String(filters.maxHeight) : ''} onChange={setNum('maxHeight', null)} placeholder="e.g. 200" />
                  </FilterField>
                  <FilterField label="City">
                    <Input value={filters.city || ''} onChange={setStr('city')} placeholder="Any city" />
                  </FilterField>
                  <FilterField label="Distance (km)">
                    <Input type="number" value={String(filters.distance ?? '')} onChange={setNum('distance', 50)} placeholder="50" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Identity & Intent">
                  <FilterField label="Gender">
                    <OptSelect value={filters.genders} onChange={setStr('genders')} options={GENDER_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Sexuality">
                    <OptSelect value={filters.sexualities} onChange={setStr('sexualities')} options={SEXUALITY_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Looking for">
                    <OptSelect value={filters.lookingFor} onChange={setStr('lookingFor')} options={LOOKING_FOR_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Dating intent">
                    <OptSelect value={filters.datingIntent} onChange={setStr('datingIntent')} options={DATING_INTENT_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Dating experience">
                    <OptSelect value={filters.datingExperience} onChange={setStr('datingExperience')} options={DATING_EXP_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Marital status">
                    <OptSelect value={filters.maritalStatus} onChange={setStr('maritalStatus')} options={MARITAL_STATUS_OPTIONS} placeholder="Any" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Lifestyle">
                  <FilterField label="Diet">
                    <OptSelect value={filters.diet} onChange={setStr('diet')} options={DIET_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Smoking">
                    <OptSelect value={filters.smoking} onChange={setStr('smoking')} options={SMOKING_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Drinking">
                    <OptSelect value={filters.drinking} onChange={setStr('drinking')} options={DRINKING_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Exercise">
                    <OptSelect value={filters.exercise} onChange={setStr('exercise')} options={EXERCISE_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Fitness level">
                    <OptSelect value={filters.fitnessLevel} onChange={setStr('fitnessLevel')} options={FITNESS_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Pets">
                    <OptSelect value={filters.pets} onChange={setStr('pets')} options={PETS_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Children">
                    <OptSelect value={filters.children} onChange={setStr('children')} options={CHILDREN_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Wants kids">
                    <OptSelect value={filters.wantsKids} onChange={setStr('wantsKids')} options={WANTS_KIDS_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Kids timeline">
                    <OptSelect value={filters.kidsTimeline} onChange={setStr('kidsTimeline')} options={KIDS_TIMELINE_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Living situation">
                    <OptSelect value={filters.livingSituation} onChange={setStr('livingSituation')} options={LIVING_OPTIONS} placeholder="Any" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Background">
                  <FilterField label="Education">
                    <OptSelect value={filters.education} onChange={setStr('education')} options={EDUCATION_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Religion">
                    <OptSelect value={filters.religion} onChange={setStr('religion')} options={RELIGION_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Politics">
                    <OptSelect value={filters.politics} onChange={setStr('politics')} options={POLITICS_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Zodiac">
                    <OptSelect value={filters.zodiac} onChange={setStr('zodiac')} options={ZODIAC_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Languages">
                    <OptSelect value={filters.languages} onChange={setStr('languages')} options={LANGUAGE_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Income">
                    <OptSelect value={filters.incomeBand} onChange={setStr('incomeBand')} options={INCOME_BAND_OPTIONS} placeholder="Any" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Personality & Style">
                  <FilterField label="Attachment style">
                    <OptSelect value={filters.attachmentStyle} onChange={setStr('attachmentStyle')} options={ATTACHMENT_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Love language">
                    <OptSelect value={filters.loveLanguage} onChange={setStr('loveLanguage')} options={LOVE_LANG_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Communication">
                    <OptSelect value={filters.communicationStyle} onChange={setStr('communicationStyle')} options={COMM_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Conflict style">
                    <OptSelect value={filters.conflictStyle} onChange={setStr('conflictStyle')} options={CONFLICT_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Social style">
                    <OptSelect value={filters.socialStyle} onChange={setStr('socialStyle')} options={SOCIAL_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Introvert / Extrovert">
                    <OptSelect value={filters.introvertExtrovert} onChange={setStr('introvertExtrovert')} options={INTRO_EXTRO_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="MBTI">
                    <OptSelect value={filters.mbti} onChange={setStr('mbti')} options={MBTI_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Enneagram">
                    <OptSelect value={filters.enneagram} onChange={setStr('enneagram')} options={ENNEAGRAM_OPTIONS} placeholder="Any" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Interests & Vibe">
                  <FilterField label="Hobbies">
                    <OptSelect value={filters.hobbies} onChange={setStr('hobbies')} options={HOBBY_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Music">
                    <OptSelect value={filters.music} onChange={setStr('music')} options={MUSIC_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Movies / TV">
                    <OptSelect value={filters.movieGenres} onChange={setStr('movieGenres')} options={MOVIE_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Travel style">
                    <OptSelect value={filters.travelStyle} onChange={setStr('travelStyle')} options={TRAVEL_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Nightlife">
                    <OptSelect value={filters.nightlife} onChange={setStr('nightlife')} options={NIGHTLIFE_OPTIONS} placeholder="Any" />
                  </FilterField>
                  <FilterField label="Social media use">
                    <OptSelect value={filters.socialMediaUse} onChange={setStr('socialMediaUse')} options={SOCIAL_MEDIA_OPTIONS} placeholder="Any" />
                  </FilterField>
                </FilterSection>

                <FilterSection title="Quality toggles">
                  <FilterField label="Verified only">
                    <ToggleField active={filters.verified} onClick={toggleBool('verified')} />
                  </FilterField>
                  <FilterField label="Photo verified">
                    <ToggleField active={filters.photoVerified} onClick={toggleBool('photoVerified')} />
                  </FilterField>
                  <FilterField label="Has photos">
                    <ToggleField active={filters.hasPhotos} onClick={toggleBool('hasPhotos')} />
                  </FilterField>
                  <FilterField label="Has bio">
                    <ToggleField active={filters.hasBio} onClick={toggleBool('hasBio')} />
                  </FilterField>
                  <FilterField label="Has prompts">
                    <ToggleField active={filters.hasPrompts} onClick={toggleBool('hasPrompts')} />
                  </FilterField>
                  <FilterField label="Active today">
                    <ToggleField active={filters.activeToday} onClick={toggleBool('activeToday')} />
                  </FilterField>
                  <FilterField label="New here">
                    <ToggleField active={filters.newHere} onClick={toggleBool('newHere')} />
                  </FilterField>
                  <FilterField label="Same city only">
                    <ToggleField active={filters.sameCity} onClick={toggleBool('sameCity')} />
                  </FilterField>
                  <FilterField label="Open to LDR">
                    <ToggleField active={filters.openToLDR} onClick={toggleBool('openToLDR')} />
                  </FilterField>
                  <FilterField label="Wants adventure">
                    <ToggleField active={filters.wantsAdventure} onClick={toggleBool('wantsAdventure')} />
                  </FilterField>
                  <FilterField label="Open to relocate">
                    <ToggleField active={filters.willingToRelocate} onClick={toggleBool('willingToRelocate')} />
                  </FilterField>
                </FilterSection>
              </div>

              {/* Footer */}
              <div className="flex gap-2 p-3 border-t border-zinc-100 bg-white/80 backdrop-blur-md shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-main to-rose-dark text-white hover:shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" /> Apply filters
                </button>
                <button
                  onClick={() => onApply(DEFAULT_FILTERS)}
                  className="px-4 py-2.5 rounded-xl text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition"
                >
                  Reset
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ─── Layout primitives (cloned from serious-mode page.tsx) ───────────── */

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-1">{title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{children}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold text-zinc-500 px-1">{label}</div>
      {children}
    </div>
  );
}

function ToggleField({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full h-9 px-3 rounded-lg border text-[12px] font-semibold flex items-center justify-between transition',
        active ? 'bg-rose-soft text-rose-dark border-rose-light' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300',
      )}
    >
      <span>{active ? 'On' : 'Off'}</span>
      <span className={cn(
        'text-[9px] font-extrabold rounded-full px-1.5 h-4 inline-flex items-center border',
        active ? 'bg-rose-main text-white border-rose-main' : 'bg-white text-zinc-400 border-zinc-200',
      )}>
        {active ? 'ON' : 'OFF'}
      </span>
    </button>
  );
}

/** Select wrapper that accepts `Option[]` (value/label pairs) and writes the
 *  selected `value` back. Mirrors the look-and-feel of DTM's plain `Select`. */
function OptSelect({
  value, onChange, options, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:ring-2 focus:ring-rose-main/40 focus:border-rose-alt outline-none transition appearance-none cursor-pointer"
    >
      <option value="" className="bg-miamo-card text-zinc-400">{placeholder || 'Any'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value} className="bg-miamo-card text-zinc-900">{o.label}</option>
      ))}
    </select>
  );
}

