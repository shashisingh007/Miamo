'use client';

import { useState, useEffect } from 'react';
import { usePersistentState } from '@/hooks/usePersistentState';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Check, Zap, MapPin, Heart, Cigarette, Wine,
  Dumbbell, GraduationCap, Dog, Baby, Moon, HeartHandshake, ArrowRight,
  ChevronDown, User, Sparkles, Salad, Languages, Vote, RotateCcw,
  Locate, Banknote, Users as UsersIcon, Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { type Filters, DEFAULT_FILTERS } from './constants';
import {
  GENDER_OPTIONS, SEXUALITY_OPTIONS, LOOKING_FOR_OPTIONS, SMOKING_OPTIONS,
  DRINKING_OPTIONS, EXERCISE_OPTIONS, DIET_OPTIONS, EDUCATION_OPTIONS,
  PETS_OPTIONS, CHILDREN_OPTIONS, RELIGION_OPTIONS, POLITICS_OPTIONS,
  ZODIAC_OPTIONS, LANGUAGE_OPTIONS, MARITAL_STATUS_OPTIONS, INCOME_BAND_OPTIONS,
  type Option,
} from '@/lib/profileOptions';

type SectionKey = 'essentials' | 'identity' | 'lifestyle' | 'background' | 'matrimony' | 'personality' | 'datingPrefs';

// Inline option lists for the extended Personality & Dating-prefs sections.
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
  ['serious-only','Serious only'],['serious-leaning','Serious-leaning'],['open','Open'],['casual-leaning','Casual-leaning'],['casual-only','Casual only'],['figuring-out','Figuring out'],
].map(([value,label])=>({value,label}));
const KIDS_TIMELINE_OPTIONS: Option[] = [
  ['0-2y','Within 2y'],['2-5y','2 – 5y'],['5y+','5+ years'],['someday','Someday'],['never','Never'],
].map(([value,label])=>({value,label}));
const WANTS_KIDS_OPTIONS: Option[] = [
  ['definitely','Definitely'],['someday','Someday'],['open','Open'],['not-sure','Not sure'],['no','No'],['have','Already have'],
].map(([value,label])=>({value,label}));
const LIVING_OPTIONS: Option[] = [
  ['alone','Alone'],['roommates','Roommates'],['partner','With partner'],['parents','With parents'],['kids','With kids'],['pg','PG/Hostel'],['travel','Nomad'],
].map(([value,label])=>({value,label}));
const TRAVEL_OPTIONS: Option[] = [
  ['backpacker','Backpacker'],['luxury','Luxury'],['budget','Budget'],['cultural','Cultural'],['beach','Beach'],['mountains','Mountains'],['roadtrip','Road trips'],['solo','Solo'],['group','Group'],['foodie','Foodie'],['spiritual','Spiritual'],['workation','Workation'],['homebody','Homebody'],
].map(([value,label])=>({value,label}));
const NIGHTLIFE_OPTIONS: Option[] = [
  ['love-it','Love it'],['sometimes','Sometimes'],['rare','Rare'],['not-my-thing','Not my thing'],
].map(([value,label])=>({value,label}));
const SOCIAL_MEDIA_OPTIONS: Option[] = [
  ['addict','Always online'],['active','Active'],['casual','Casual'],['lurker','Lurker'],['minimal','Minimal'],['off-grid','Off-grid'],
].map(([value,label])=>({value,label}));

export function FilterPanel({
  isOpen, onClose, filters, onApply,
}: {
  isOpen: boolean; onClose: () => void; filters: Filters;
  onApply: (f: Filters) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [local, setLocal] = useState<Filters>(filters);
  const [switchingMode, setSwitchingMode] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while open + Escape closes
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);
  const [open, setOpen] = usePersistentState<Record<SectionKey, boolean>>('discover:filterPanel:open', {
    essentials: true, identity: false, lifestyle: false, background: false, matrimony: false,
    personality: false, datingPrefs: false,
  });
  useEffect(() => { if (isOpen) setLocal(filters); }, [isOpen, filters]);

  const set = (key: keyof Filters, val: any) => setLocal(p => ({ ...p, [key]: val }));
  const toggleChip = (key: keyof Filters, val: string) => {
    const current = ((local[key] as string) || '').split(',').filter(Boolean);
    const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val];
    set(key, next.join(','));
  };
  const isChipActive = (key: keyof Filters, val: string) =>
    ((local[key] as string) || '').split(',').filter(Boolean).includes(val);
  const chipCount = (key: keyof Filters) =>
    ((local[key] as string) || '').split(',').filter(Boolean).length;

  // Active filter count (for header + Apply button)
  const activeCount = (() => {
    let n = 0;
    if (local.activeToday) n++; if (local.newHere) n++; if (local.verified) n++; if (local.hasPhotos) n++;
    if (local.willingToRelocate) n++;
    if (local.photoVerified) n++; if (local.hasBio) n++; if (local.hasPrompts) n++;
    if (local.sameCity) n++; if (local.openToLDR) n++; if (local.wantsAdventure) n++;
    if (local.minAge !== 18 || local.maxAge !== 99) n++;
    if (local.minHeight || local.maxHeight) n++;
    if (local.city) n++;
    if (local.distance && local.distance > 0 && local.cityLat != null) n++;
    (['genders','sexualities','lookingFor','smoking','drinking','exercise','diet','education','pets','children','religion','politics','zodiac','languages','maritalStatus','incomeBand','hobbies','music','movieGenres','fitnessLevel','attachmentStyle','loveLanguage','communicationStyle','conflictStyle','socialStyle','introvertExtrovert','mbti','enneagram','datingExperience','datingIntent','kidsTimeline','wantsKids','livingSituation','travelStyle','nightlife','socialMediaUse'] as const).forEach(k => {
      const v = local[k as keyof Filters];
      if (typeof v === 'string' && v) n += v.split(',').filter(Boolean).length;
    });
    return n;
  })();

  const Chip = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} className={cn(
      'px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-all border',
      active
        ? 'bg-rose-main/15 text-rose-main border-rose-main/40'
        : 'bg-miamo-surface border-border text-text-muted hover:border-rose-main/30 hover:text-text-secondary',
    )}>{label}</button>
  );

  const ChipRow = ({ k, options }: { k: keyof Filters; options: Option[] }) => (
    <div className="flex flex-wrap gap-1.5">
      {options.map(({ value, label }) => (
        <Chip key={value} label={label} active={isChipActive(k, value)} onClick={() => toggleChip(k, value)} />
      ))}
    </div>
  );

  const Group = ({ k, title, badge, children }: { k: SectionKey; title: string; badge: number; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-border bg-miamo-surface/60 overflow-hidden">
      <button
        onClick={() => setOpen(p => ({ ...p, [k]: !p[k] }))}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-miamo-surface/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-text-primary tracking-wide">{title}</span>
          {badge > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-main/20 text-rose-main">{badge}</span>
          )}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform', open[k] && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open[k] && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const SubLabel = ({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) => (
    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] flex items-center gap-2">
      {icon}{children}
    </h4>
  );

  // Per-group badge counts
  const essentialsCount =
    (local.activeToday ? 1 : 0) + (local.newHere ? 1 : 0) + (local.verified ? 1 : 0) + (local.hasPhotos ? 1 : 0)
    + (local.minAge !== 18 || local.maxAge !== 99 ? 1 : 0) + (local.minHeight || local.maxHeight ? 1 : 0)
    + (local.city ? 1 : 0);
  const identityCount = chipCount('genders') + chipCount('sexualities') + chipCount('lookingFor');
  const lifestyleCount = chipCount('smoking') + chipCount('drinking') + chipCount('exercise')
    + chipCount('diet' as keyof Filters) + chipCount('pets') + chipCount('children');
  const backgroundCount = chipCount('education') + chipCount('religion')
    + chipCount('politics' as keyof Filters) + chipCount('zodiac') + chipCount('languages' as keyof Filters);
  const matrimonyCount = chipCount('maritalStatus' as keyof Filters) + chipCount('incomeBand' as keyof Filters) + (local.willingToRelocate ? 1 : 0);
  const personalityCount = chipCount('hobbies' as keyof Filters) + chipCount('music' as keyof Filters) + chipCount('movieGenres' as keyof Filters)
    + chipCount('fitnessLevel' as keyof Filters) + chipCount('attachmentStyle' as keyof Filters) + chipCount('loveLanguage' as keyof Filters)
    + chipCount('communicationStyle' as keyof Filters) + chipCount('conflictStyle' as keyof Filters) + chipCount('socialStyle' as keyof Filters)
    + chipCount('introvertExtrovert' as keyof Filters) + chipCount('mbti' as keyof Filters) + chipCount('enneagram' as keyof Filters)
    + chipCount('travelStyle' as keyof Filters) + chipCount('nightlife' as keyof Filters) + chipCount('socialMediaUse' as keyof Filters);
  const datingPrefsCount = chipCount('datingExperience' as keyof Filters) + chipCount('datingIntent' as keyof Filters)
    + chipCount('kidsTimeline' as keyof Filters) + chipCount('wantsKids' as keyof Filters) + chipCount('livingSituation' as keyof Filters)
    + (local.photoVerified ? 1 : 0) + (local.hasBio ? 1 : 0) + (local.hasPrompts ? 1 : 0)
    + (local.sameCity ? 1 : 0) + (local.openToLDR ? 1 : 0) + (local.wantsAdventure ? 1 : 0);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-40 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[420px] max-w-[94vw] bg-miamo-card border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-miamo-card/95 backdrop-blur-xl border-b border-border px-5 py-4 flex items-center justify-between">
              <button onClick={onClose} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <h3 className="text-sm font-bold text-text-primary tracking-wide flex items-center gap-2">
                Filters
                {activeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-main/20 text-rose-main">{activeCount}</span>
                )}
              </h3>
              <button
                onClick={() => setLocal(DEFAULT_FILTERS)}
                className="text-[11px] text-rose-main hover:text-text-primary transition-colors font-semibold flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              <Group k="essentials" title="Essentials" badge={essentialsCount}>
                <div>
                  <SubLabel icon={<Zap className="w-3 h-3 text-rose-alt" />}>Quick filters</SubLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip label="Active today" active={local.activeToday} onClick={() => set('activeToday', !local.activeToday)} />
                    <Chip label="New here" active={local.newHere} onClick={() => set('newHere', !local.newHere)} />
                    <Chip label="Verified" active={local.verified} onClick={() => set('verified', !local.verified)} />
                    <Chip label="Has photos" active={local.hasPhotos} onClick={() => set('hasPhotos', !local.hasPhotos)} />
                  </div>
                </div>
                <div>
                  <SubLabel>Age</SubLabel>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="number" value={local.minAge} onChange={e => set('minAge', parseInt(e.target.value) || 18)}
                      className="w-20 h-9 rounded-lg bg-miamo-card border border-border text-text-primary text-center text-sm focus:border-rose-main/50 focus:outline-none" min={18} max={99} />
                    <span className="text-text-muted text-xs">to</span>
                    <input type="number" value={local.maxAge} onChange={e => set('maxAge', parseInt(e.target.value) || 99)}
                      className="w-20 h-9 rounded-lg bg-miamo-card border border-border text-text-primary text-center text-sm focus:border-rose-main/50 focus:outline-none" min={18} max={99} />
                    <span className="text-text-muted text-xs">years</span>
                  </div>
                </div>
                <div>
                  <SubLabel>Height (cm)</SubLabel>
                  <div className="mt-2 flex items-center gap-3">
                    <input type="number" value={local.minHeight || ''} onChange={e => set('minHeight', parseInt(e.target.value) || null)}
                      className="w-20 h-9 rounded-lg bg-miamo-card border border-border text-text-primary text-center text-sm focus:border-rose-main/50 focus:outline-none" placeholder="Min" />
                    <span className="text-text-muted text-xs">to</span>
                    <input type="number" value={local.maxHeight || ''} onChange={e => set('maxHeight', parseInt(e.target.value) || null)}
                      className="w-20 h-9 rounded-lg bg-miamo-card border border-border text-text-primary text-center text-sm focus:border-rose-main/50 focus:outline-none" placeholder="Max" />
                  </div>
                </div>
                <div>
                  <SubLabel icon={<MapPin className="w-3 h-3 text-rose-alt" />}>City</SubLabel>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1">
                      <CityAutocomplete
                        value={local.city}
                        onChange={(display, city) => setLocal(p => ({ ...p, city: display, cityLat: city?.lat ?? null, cityLng: city?.lng ?? null }))}
                        placeholder="Start typing a city…"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={detectingLoc}
                      onClick={() => {
                        if (!('geolocation' in navigator)) { toast.error('Geolocation unavailable', 'Your browser does not support location'); return; }
                        setDetectingLoc(true);
                        navigator.geolocation.getCurrentPosition(async (pos) => {
                          try {
                            const r = await api.nearestCity(pos.coords.latitude, pos.coords.longitude);
                            const c = r.data;
                            setLocal(p => ({ ...p, city: c.display, cityLat: c.lat, cityLng: c.lng }));
                            toast.success('Location detected', c.name);
                          } catch { toast.error('Could not resolve city'); }
                          finally { setDetectingLoc(false); }
                        }, (err) => {
                          setDetectingLoc(false);
                          toast.error('Location blocked', err.code === 1 ? 'Allow location access in browser settings' : 'Try again');
                        }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
                      }}
                      className="h-10 px-3 rounded-lg border border-border bg-miamo-card text-text-secondary hover:border-rose-main/40 hover:text-rose-main disabled:opacity-50 transition-all"
                      title="Use my current location"
                    >
                      <Locate className={cn('w-4 h-4', detectingLoc && 'animate-pulse')} />
                    </button>
                  </div>
                  {local.cityLat != null && local.cityLng != null && (
                    <p className="mt-1 text-[10px] text-emerald-500">Coords saved · distance filter active</p>
                  )}
                </div>
                <div>
                  <SubLabel icon={<MapPin className="w-3 h-3 text-rose-alt" />}>Max distance</SubLabel>
                  <div className="mt-2">
                    <input
                      type="range"
                      min={5}
                      max={500}
                      step={5}
                      value={local.distance || 50}
                      onChange={e => set('distance', parseInt(e.target.value))}
                      className="w-full accent-rose-main"
                    />
                    <div className="flex justify-between text-[11px] text-text-muted mt-1">
                      <span>{local.distance ? `${local.distance} km` : 'Anywhere'}</span>
                      <button type="button" onClick={() => set('distance', 0)} className="hover:text-rose-main">Anywhere</button>
                    </div>
                    {(local.cityLat == null || local.cityLng == null) && local.distance > 0 && (
                      <p className="mt-1 text-[10px] text-amber-500">Set your city above so we can filter by distance.</p>
                    )}
                  </div>
                </div>
              </Group>

              <Group k="identity" title="Identity & Intent" badge={identityCount}>
                <div>
                  <SubLabel icon={<User className="w-3 h-3 text-rose-alt" />}>Show me</SubLabel>
                  <div className="mt-2"><ChipRow k="genders" options={GENDER_OPTIONS} /></div>
                </div>
                <div>
                  <SubLabel icon={<Sparkles className="w-3 h-3 text-rose-alt" />}>Sexuality</SubLabel>
                  <div className="mt-2"><ChipRow k="sexualities" options={SEXUALITY_OPTIONS} /></div>
                </div>
                <div>
                  <SubLabel icon={<Heart className="w-3 h-3 text-rose-light" />}>Looking for</SubLabel>
                  <div className="mt-2"><ChipRow k="lookingFor" options={LOOKING_FOR_OPTIONS} /></div>
                  {isChipActive('lookingFor', 'marriage') && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-xl border border-violet-300/50 bg-gradient-to-br from-violet-500/10 to-rose-main/10 p-3">
                      <div className="flex items-start gap-2">
                        <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                        <div className="flex-1">
                          <div className="text-[12px] font-semibold text-text-primary">Looking for marriage? Switch to DTM.</div>
                          <p className="mt-0.5 text-[11px] text-text-muted">DTM (Date-to-Marry) is the matrimonial-grade flow — family, education, horoscope, partner prefs and access control.</p>
                          <button disabled={switchingMode} onClick={async () => {
                            setSwitchingMode(true);
                            try { await api.updateProfile({ seriousMode: true }); } catch {}
                            router.push('/serious-mode');
                          }} className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-500 px-3 py-1 text-[11px] font-semibold text-white shadow-button disabled:opacity-50">
                            {switchingMode ? 'Switching…' : <>Take me to DTM <ArrowRight className="h-3 w-3" /></>}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </Group>

              <Group k="lifestyle" title="Lifestyle" badge={lifestyleCount}>
                <div><SubLabel icon={<Cigarette className="w-3 h-3 text-rose-alt" />}>Smoking</SubLabel><div className="mt-2"><ChipRow k="smoking" options={SMOKING_OPTIONS} /></div></div>
                <div><SubLabel icon={<Wine className="w-3 h-3 text-rose-alt" />}>Drinking</SubLabel><div className="mt-2"><ChipRow k="drinking" options={DRINKING_OPTIONS} /></div></div>
                <div><SubLabel icon={<Dumbbell className="w-3 h-3 text-rose-alt" />}>Exercise</SubLabel><div className="mt-2"><ChipRow k="exercise" options={EXERCISE_OPTIONS} /></div></div>
                <div><SubLabel icon={<Salad className="w-3 h-3 text-rose-alt" />}>Diet</SubLabel><div className="mt-2"><ChipRow k={'diet' as keyof Filters} options={DIET_OPTIONS} /></div></div>
                <div><SubLabel icon={<Dog className="w-3 h-3 text-rose-alt" />}>Pets</SubLabel><div className="mt-2"><ChipRow k="pets" options={PETS_OPTIONS} /></div></div>
                <div><SubLabel icon={<Baby className="w-3 h-3 text-rose-light" />}>Children</SubLabel><div className="mt-2"><ChipRow k="children" options={CHILDREN_OPTIONS} /></div></div>
              </Group>

              <Group k="background" title="Background" badge={backgroundCount}>
                <div><SubLabel icon={<GraduationCap className="w-3 h-3 text-rose-alt" />}>Education</SubLabel><div className="mt-2"><ChipRow k="education" options={EDUCATION_OPTIONS} /></div></div>
                <div><SubLabel icon={<span className="text-[10px]">🙏</span>}>Religion</SubLabel><div className="mt-2"><ChipRow k="religion" options={RELIGION_OPTIONS} /></div></div>
                <div><SubLabel icon={<Vote className="w-3 h-3 text-rose-alt" />}>Politics</SubLabel><div className="mt-2"><ChipRow k={'politics' as keyof Filters} options={POLITICS_OPTIONS} /></div></div>
                <div><SubLabel icon={<Moon className="w-3 h-3 text-rose-alt" />}>Zodiac</SubLabel><div className="mt-2"><ChipRow k="zodiac" options={ZODIAC_OPTIONS} /></div></div>
                <div><SubLabel icon={<Languages className="w-3 h-3 text-rose-alt" />}>Languages</SubLabel><div className="mt-2"><ChipRow k={'languages' as keyof Filters} options={LANGUAGE_OPTIONS} /></div></div>
              </Group>

              <Group k="matrimony" title="Matrimony (DTM)" badge={matrimonyCount}>
                <div><SubLabel icon={<UsersIcon className="w-3 h-3 text-rose-alt" />}>Marital status</SubLabel><div className="mt-2"><ChipRow k={'maritalStatus' as keyof Filters} options={MARITAL_STATUS_OPTIONS} /></div></div>
                <div><SubLabel icon={<Banknote className="w-3 h-3 text-rose-alt" />}>Income band</SubLabel><div className="mt-2"><ChipRow k={'incomeBand' as keyof Filters} options={INCOME_BAND_OPTIONS} /></div></div>
                <div>
                  <SubLabel icon={<Plane className="w-3 h-3 text-rose-alt" />}>Willing to relocate</SubLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip label="Yes" active={local.willingToRelocate} onClick={() => set('willingToRelocate', !local.willingToRelocate)} />
                  </div>
                </div>
              </Group>

              <Group k="personality" title="Personality & Interests" badge={personalityCount}>
                <div><SubLabel icon={<Sparkles className="w-3 h-3 text-rose-alt" />}>Hobbies</SubLabel><div className="mt-2"><ChipRow k={'hobbies' as keyof Filters} options={HOBBY_OPTIONS} /></div></div>
                <div><SubLabel>Music</SubLabel><div className="mt-2"><ChipRow k={'music' as keyof Filters} options={MUSIC_OPTIONS} /></div></div>
                <div><SubLabel>Movie genres</SubLabel><div className="mt-2"><ChipRow k={'movieGenres' as keyof Filters} options={MOVIE_OPTIONS} /></div></div>
                <div><SubLabel icon={<Dumbbell className="w-3 h-3 text-rose-alt" />}>Fitness level</SubLabel><div className="mt-2"><ChipRow k={'fitnessLevel' as keyof Filters} options={FITNESS_OPTIONS} /></div></div>
                <div><SubLabel icon={<Heart className="w-3 h-3 text-rose-alt" />}>Attachment style</SubLabel><div className="mt-2"><ChipRow k={'attachmentStyle' as keyof Filters} options={ATTACHMENT_OPTIONS} /></div></div>
                <div><SubLabel icon={<Heart className="w-3 h-3 text-rose-alt" />}>Love language</SubLabel><div className="mt-2"><ChipRow k={'loveLanguage' as keyof Filters} options={LOVE_LANG_OPTIONS} /></div></div>
                <div><SubLabel>Communication style</SubLabel><div className="mt-2"><ChipRow k={'communicationStyle' as keyof Filters} options={COMM_OPTIONS} /></div></div>
                <div><SubLabel>Conflict style</SubLabel><div className="mt-2"><ChipRow k={'conflictStyle' as keyof Filters} options={CONFLICT_OPTIONS} /></div></div>
                <div><SubLabel icon={<UsersIcon className="w-3 h-3 text-rose-alt" />}>Social style</SubLabel><div className="mt-2"><ChipRow k={'socialStyle' as keyof Filters} options={SOCIAL_OPTIONS} /></div></div>
                <div><SubLabel>Introvert / Extrovert</SubLabel><div className="mt-2"><ChipRow k={'introvertExtrovert' as keyof Filters} options={INTRO_EXTRO_OPTIONS} /></div></div>
                <div><SubLabel>MBTI</SubLabel><div className="mt-2"><ChipRow k={'mbti' as keyof Filters} options={MBTI_OPTIONS} /></div></div>
                <div><SubLabel>Enneagram</SubLabel><div className="mt-2"><ChipRow k={'enneagram' as keyof Filters} options={ENNEAGRAM_OPTIONS} /></div></div>
                <div><SubLabel icon={<Plane className="w-3 h-3 text-rose-alt" />}>Travel style</SubLabel><div className="mt-2"><ChipRow k={'travelStyle' as keyof Filters} options={TRAVEL_OPTIONS} /></div></div>
                <div><SubLabel icon={<Moon className="w-3 h-3 text-rose-alt" />}>Nightlife</SubLabel><div className="mt-2"><ChipRow k={'nightlife' as keyof Filters} options={NIGHTLIFE_OPTIONS} /></div></div>
                <div><SubLabel>Social media use</SubLabel><div className="mt-2"><ChipRow k={'socialMediaUse' as keyof Filters} options={SOCIAL_MEDIA_OPTIONS} /></div></div>
              </Group>

              <Group k="datingPrefs" title="Dating preferences" badge={datingPrefsCount}>
                <div><SubLabel icon={<Heart className="w-3 h-3 text-rose-alt" />}>Dating experience</SubLabel><div className="mt-2"><ChipRow k={'datingExperience' as keyof Filters} options={DATING_EXP_OPTIONS} /></div></div>
                <div><SubLabel icon={<HeartHandshake className="w-3 h-3 text-rose-alt" />}>Dating intent</SubLabel><div className="mt-2"><ChipRow k={'datingIntent' as keyof Filters} options={DATING_INTENT_OPTIONS} /></div></div>
                <div><SubLabel icon={<Baby className="w-3 h-3 text-rose-alt" />}>Wants kids</SubLabel><div className="mt-2"><ChipRow k={'wantsKids' as keyof Filters} options={WANTS_KIDS_OPTIONS} /></div></div>
                <div><SubLabel icon={<Baby className="w-3 h-3 text-rose-alt" />}>Kids timeline</SubLabel><div className="mt-2"><ChipRow k={'kidsTimeline' as keyof Filters} options={KIDS_TIMELINE_OPTIONS} /></div></div>
                <div><SubLabel>Living situation</SubLabel><div className="mt-2"><ChipRow k={'livingSituation' as keyof Filters} options={LIVING_OPTIONS} /></div></div>
                <div>
                  <SubLabel>Quality toggles</SubLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Chip label="Photo verified" active={local.photoVerified} onClick={() => set('photoVerified', !local.photoVerified)} />
                    <Chip label="Has bio" active={local.hasBio} onClick={() => set('hasBio', !local.hasBio)} />
                    <Chip label="Has prompts" active={local.hasPrompts} onClick={() => set('hasPrompts', !local.hasPrompts)} />
                    <Chip label="Same city" active={local.sameCity} onClick={() => set('sameCity', !local.sameCity)} />
                    <Chip label="Open to LDR" active={local.openToLDR} onClick={() => set('openToLDR', !local.openToLDR)} />
                    <Chip label="Wants adventure" active={local.wantsAdventure} onClick={() => set('wantsAdventure', !local.wantsAdventure)} />
                  </div>
                </div>
              </Group>
            </div>

            {/* Footer */}
            <div className="bg-miamo-card/95 backdrop-blur-xl border-t border-border p-4 flex gap-3">
              <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-border text-text-secondary text-sm font-semibold hover:bg-miamo-surface transition-all">Cancel</button>
              <button onClick={() => { onApply(local); onClose(); }} className="flex-1 h-11 rounded-xl bg-rose-main text-white text-sm font-bold hover:bg-rose-main/90 transition-all flex items-center justify-center gap-2 shadow-button">
                <Check className="w-4 h-4" /> Apply{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
