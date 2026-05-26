'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  motion, AnimatePresence, useReducedMotion,
  useMotionValue, useTransform, useSpring, useScroll, animate,
} from 'framer-motion';
import {
  ArrowRight, Heart, Sparkles, Shield, MessageCircle, Star,
  Quote, Users, MapPin, Check, Flame, Music, Coffee, Camera, Plane,
  Compass, Brain, Lock, Zap, Globe2, Calendar, Gift, Mic2, Wand2,
  EyeOff, ChevronDown, BellRing, BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

/* ═══════════════════════════════════════════════════════════════
   LANDING PAGE — v2: bigger, richer, more "dating-app"
   ─ Big animated Miamo wordmark in the hero
   ─ 3D tilt swipe-deck (mouse-parallax + perspective)
   ─ Floating profile bubbles, live ticker, peek widgets
   ─ Stats marquee, compatibility radar, vibe-score gauge
   ─ Date-ideas carousel, beats preview, signature features
   ─ Couple testimonials, gradient final CTA
   ══════════════════════════════════════════════════════════════ */

type Demo = {
  name: string; age: number; city: string;
  blurb: string; tags: string[]; hue: number; initial: string;
};

const DECK: Demo[] = [
  { name: 'Aanya',  age: 26, city: 'Bengaluru', blurb: 'Bookshops, biryani, and bouldering on weekends.', tags: ['Books','Climbing','Coffee'], hue: 12,  initial: 'A' },
  { name: 'Rohan',  age: 29, city: 'Mumbai',    blurb: 'Indie filmmaker. Looking for someone to argue about scripts with.', tags: ['Cinema','Travel'], hue: 200, initial: 'R' },
  { name: 'Meera',  age: 27, city: 'Delhi',     blurb: 'Carnatic vocalist by night, product lead by day.', tags: ['Music','Design'], hue: 320, initial: 'M' },
  { name: 'Kabir',  age: 30, city: 'Pune',      blurb: 'Sunday hiker. Loves stand-up, kindness, and proper chai.', tags: ['Hiking','Comedy'], hue: 24,  initial: 'K' },
  { name: 'Saira',  age: 25, city: 'Hyderabad', blurb: 'Painter. Believes pets are pre-installed soulmates.', tags: ['Art','Pets'], hue: 280, initial: 'S' },
];

const TESTIMONIALS = [
  { name: 'Aditi & Varun',  city: 'Mumbai',    months: 11, story: 'We matched over a shared love for ghazals at 1am. Three months in, he proposed at the same dosa cart where we had our first date.' },
  { name: 'Nikhil & Tara',  city: 'Bengaluru', months: 7,  story: 'I almost swiped past her profile. The prompt — "I will out-debate you on Murakami" — made me stop. We have been arguing happily ever since.' },
  { name: 'Riya & Arjun',   city: 'Delhi',     months: 14, story: 'Beats kept us going through long-distance for four months. The little daily check-in turned into the steadiest love we have ever known.' },
  { name: 'Faiza & Imran',  city: 'Hyderabad', months: 5,  story: 'DTM mode was honest about what we both wanted. Kundli matched, families met in week six, engaged in month four. No games, just clarity.' },
];

const ACTIVITY_LINES = [
  'Aanya in Bengaluru sent a Miamo Move',
  'Rohan and Priya matched 8 minutes ago',
  '142 conversations starting right now',
  'Meera is on a 12-day Beats streak with Aryan',
  'Kabir verified his profile · welcome',
  'Saira completed her DTM profile',
];

const DATE_IDEAS = [
  { icon: Coffee, hue: 24,  title: 'Slow Sunday brunch',         tag: 'Cozy' },
  { icon: Music,  hue: 320, title: 'Live jazz at The Piano Man', tag: 'Romantic' },
  { icon: Camera, hue: 200, title: 'Street-photo walk in Bandra',tag: 'Creative' },
  { icon: Plane,  hue: 160, title: 'Weekend in Coorg coffee hills',tag:'Adventurous' },
  { icon: Gift,   hue: 12,  title: 'Pottery class for two',      tag: 'Playful' },
  { icon: Calendar,hue: 280, title:'Old-Delhi food crawl',       tag: 'Foodie' },
];

const SIGNALS = [
  { label: 'Values',    pct: 92, icon: Heart },
  { label: 'Vibe',      pct: 88, icon: Sparkles },
  { label: 'Intent',    pct: 95, icon: Compass },
  { label: 'Lifestyle', pct: 81, icon: Coffee },
  { label: 'Activity',  pct: 76, icon: Zap },
  { label: 'AI Match',  pct: 90, icon: Brain },
];

const FEATURES = [
  { icon: Heart,         title: 'Miamo Moves',  desc: 'A like with intention — add a line, not just a tap.' },
  { icon: MessageCircle, title: 'Beats',        desc: 'A daily back-and-forth that keeps new connections alive.' },
  { icon: Sparkles,      title: 'AI Match',     desc: 'Six honest signals — not vanity metrics — find people who fit.' },
  { icon: Shield,        title: 'Date to Marry', desc: 'A separate, serious lane. Kundli, bio-data, verified intent.' },
  { icon: Mic2,          title: 'Voice Prompts', desc: 'Hear them say it. A 15-sec voice note beats any photo.' },
  { icon: Wand2,         title: 'Vibe Check',   desc: 'A 60-second quiz that turns into your living personality card.' },
  { icon: Lock,          title: 'Private Album', desc: 'Photos you only unlock for someone you actually trust.' },
  { icon: Globe2,        title: 'Date Planner', desc: 'AI suggests a first date you both will say yes to.' },
];

const CITIES = [
  'Mumbai','Bengaluru','Delhi','Pune','Hyderabad','Chennai','Kolkata','Ahmedabad',
  'Jaipur','Goa','Chandigarh','Lucknow','Indore','Kochi','Bhopal','Gurgaon',
];

const FAQS = [
  { q: 'Is Miamo free to join?', a: 'Yes. Build your profile, get matched, send Miamo Moves and start Beats — all free. Premium unlocks AI Match boosts and the private album.' },
  { q: 'How is Date to Marry different from Discover?', a: 'DTM is a separate, more serious lane with verified intent, kundli matching, bio-data, and a slower review flow. Discover stays casual.' },
  { q: 'Are profiles real and verified?', a: 'We verify every photo with a selfie check, block disposable emails, and use ML to flag bot patterns within minutes.' },
  { q: 'Who sees my photos?', a: 'You choose. Public photos are visible after a match. Your Private Album is only unlocked when you tap unlock for a specific person.' },
  { q: 'Can I pause my profile?', a: 'Anytime. One toggle in Settings hides you from Discover without deleting any matches or chats.' },
];

/* ── helpers ─────────────────────────────────────────────── */

function ProfileCard({ p, className = '' }: { p: Demo; className?: string }) {
  const gradient = `linear-gradient(135deg, hsl(${p.hue}, 78%, 72%) 0%, hsl(${(p.hue + 30) % 360}, 80%, 62%) 100%)`;
  return (
    <div className={`relative w-[280px] h-[380px] rounded-3xl overflow-hidden shadow-[0_24px_70px_-20px_rgba(190,90,70,0.55)] bg-white ${className}`}>
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div className="absolute inset-0 mix-blend-overlay opacity-30"
        style={{ backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.5), transparent 55%)' }} />
      <div className="absolute inset-x-0 top-0 h-[68%] flex items-center justify-center">
        <span className="font-brand text-[140px] font-semibold text-white/90 select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.25)]">{p.initial}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-xl leading-none">{p.name}</h3>
          <span className="text-white/85 text-sm">{p.age}</span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] bg-emerald-400/90 text-emerald-950 font-bold rounded-full px-2 py-0.5">
            <Check className="w-2.5 h-2.5" /> Verified
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/85">
          <MapPin className="w-3 h-3" /> {p.city}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-white">{p.blurb}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {p.tags.map(t => (
            <span key={t} className="text-[10px] font-medium bg-white/25 backdrop-blur-sm border border-white/40 rounded-full px-2 py-0.5">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 3D-tilt swipe deck ────────────────────────────────── */
function SwipeDeck() {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const reduceMotion = useReducedMotion();

  // mouse parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, [-1, 1], [-14, 14]), { stiffness: 120, damping: 14 });
  const rotX = useSpring(useTransform(my, [-1, 1], [10, -10]),  { stiffness: 120, damping: 14 });

  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => {
      setDirection(prev => (prev === 'right' ? 'left' : 'right'));
      setIdx(i => (i + 1) % DECK.length);
    }, 3400);
    return () => clearInterval(t);
  }, [reduceMotion]);

  const top    = DECK[idx];
  const middle = DECK[(idx + 1) % DECK.length];
  const back   = DECK[(idx + 2) % DECK.length];

  return (
    <div
      className="relative h-[440px] w-[300px] mx-auto"
      style={{ perspective: 1200 }}
      onMouseMove={e => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width)  * 2 - 1);
        my.set(((e.clientY - r.top)  / r.height) * 2 - 1);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      aria-label="Live profile preview"
    >
      <motion.div style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }} className="relative w-full h-full">
        <motion.div
          key={`back-${back.name}`}
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: 0.86, y: 30, opacity: 0.45 }}
          style={{ zIndex: 1 }}
        >
          <ProfileCard p={back} />
        </motion.div>
        <motion.div
          key={`mid-${middle.name}`}
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: 0.93, y: 15, opacity: 0.78 }}
          style={{ zIndex: 2 }}
        >
          <ProfileCard p={middle} />
        </motion.div>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`top-${top.name}-${idx}`}
            className="absolute inset-0 flex items-center justify-center"
            style={{ zIndex: 3 }}
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
            exit={{
              opacity: 0,
              x: direction === 'right' ? 380 : -380,
              rotate: direction === 'right' ? 22 : -22,
              transition: { duration: 0.6 },
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <ProfileCard p={top} />
            <motion.div
              key={`stamp-${idx}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1.05, 1.05, 1] }}
              transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1], delay: 1.5 }}
              className={`pointer-events-none absolute top-10 ${
                direction === 'right'
                  ? 'right-6 rotate-12 text-rose-main border-rose-main bg-rose-soft'
                  : 'left-6 -rotate-12 text-zinc-500 border-zinc-300 bg-white/85'
              } border-2 rounded-xl px-3 py-1 text-xs font-extrabold uppercase tracking-widest`}
            >
              {direction === 'right' ? 'Miamo Move' : 'Maybe Later'}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {direction === 'right' && (
            <motion.div
              key={`hearts-${idx}`}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0"
            >
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ left: `${24 + i * 12}%`, bottom: '36%' }}
                  initial={{ opacity: 0, y: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 1, 0], y: -140 - i * 8, scale: [0.6, 1.1, 0.9], rotate: i % 2 ? 10 : -10 }}
                  transition={{ duration: 1.7, delay: 0.4 + i * 0.1 }}
                >
                  <Heart className="w-5 h-5 text-rose-main fill-rose-main drop-shadow" />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* glow under deck */}
      <div aria-hidden className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[260px] h-8 rounded-full blur-2xl bg-rose-main/35" />
    </div>
  );
}

/* ── floating background bubbles ───────────────────────── */
function FloatingBackgroundCards() {
  const reduce = useReducedMotion();
  // ~28 pastel bubbles spread across the entire page height (0–100%)
  const bubbles = useMemo(() => {
    const initials = ['A','R','M','K','S','P','I','N','V','T','J','D','L','Z','Y','O','H','U','E','C','B','F','G','Q','X','W'];
    return Array.from({ length: 28 }).map((_, i) => {
      const hue = (i * 37 + 8) % 360;
      // deterministic-ish spread using i
      const top  = ((i * 11) % 96) + 1;            // 1–97%
      const left = ((i * 23 + 7) % 94) + 1;        // 1–95%
      const size = 36 + ((i * 13) % 60);           // 36–96px
      const delay = (i % 6) * 0.6;
      const dur   = 8 + (i % 7);
      return {
        hue, initial: initials[i % initials.length],
        top: `${top}%`, left: `${left}%`,
        size, delay, dur,
        // very light pastel: high lightness, low-ish saturation, low opacity
        from: `hsl(${hue}, 70%, 88%)`,
        to:   `hsl(${(hue + 30) % 360}, 70%, 82%)`,
        opacity: 0.32 + ((i % 4) * 0.06),          // 0.32–0.50
        drift:   18 + (i % 4) * 6,                  // 18–36 px
      };
    });
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full flex items-center justify-center font-brand font-semibold"
          style={{
            top: b.top, left: b.left,
            width: b.size, height: b.size,
            fontSize: b.size * 0.4,
            opacity: b.opacity,
            color: `hsl(${b.hue}, 55%, 45%)`,
            background: `linear-gradient(135deg, ${b.from}, ${b.to})`,
            boxShadow: `0 14px 30px -12px hsl(${b.hue}, 55%, 70%)`,
          }}
          animate={reduce ? {} : {
            y: [0, -b.drift, 0],
            x: [0, i % 2 ? b.drift / 2 : -b.drift / 2, 0],
            rotate: [0, i % 2 ? 8 : -8, 0],
          }}
          transition={{ duration: b.dur, repeat: Infinity, delay: b.delay, ease: 'easeInOut' }}
        >
          {b.initial}
        </motion.div>
      ))}
    </div>
  );
}

/* ── live ticker ───────────────────────────────────────── */
function LiveTicker() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI(x => (x + 1) % ACTIVITY_LINES.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur border border-rose-soft px-4 py-2 shadow-md">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-main opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-main" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-[12px] font-semibold text-text-primary whitespace-nowrap"
        >
          {ACTIVITY_LINES[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/* ── chat bubble peek + match toast ────────────────────── */
function ChatBubblePeek() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -4 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="absolute -left-6 sm:left-0 top-6 hidden sm:block w-[240px] rounded-2xl rounded-bl-md bg-white shadow-[0_20px_50px_-15px_rgba(0,0,0,0.25)] border border-rose-soft p-3 z-20"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center text-white text-[11px] font-semibold">R</div>
        <div className="text-[11px] font-semibold text-text-primary">Rohan · 2m</div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online</span>
      </div>
      <p className="mt-2 text-[12.5px] text-text-primary leading-snug">&ldquo;Okay your bookshelf is dangerous. We need to talk about Calvino.&rdquo;</p>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-rose-main font-bold"><Check className="w-3 h-3" /> Beat day 3</div>
    </motion.div>
  );
}

function MatchToast() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, rotate: 6 }}
      whileInView={{ opacity: 1, y: 0, rotate: 6 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.3 }}
      className="absolute -right-4 sm:right-0 bottom-10 hidden sm:flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-main to-rose-dark text-white px-4 py-2.5 shadow-[0_20px_50px_-15px_rgba(190,90,70,0.7)] z-20"
    >
      <Sparkles className="w-4 h-4" />
      <div>
        <div className="text-[12px] font-bold leading-none">It&rsquo;s a match!</div>
        <div className="text-[10.5px] opacity-90 mt-0.5">You and Aanya · say hello</div>
      </div>
    </motion.div>
  );
}

/* ── animated counter ──────────────────────────────────── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!ref.current) return;
    if (reduce) { ref.current.textContent = to.toLocaleString() + suffix; return; }
    const controls = animate(0, to, {
      duration: 1.6, ease: 'easeOut',
      onUpdate: v => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString() + suffix; },
    });
    return () => controls.stop();
  }, [to, suffix, reduce]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ── stats marquee strip ───────────────────────────────── */
function StatsMarquee() {
  const items = [
    { n: 280000, s: '+', label: 'happy couples' },
    { n: 12450,  s: '',  label: 'Beats sent today' },
    { n: 142,    s: '',  label: 'matches this hour' },
    { n: 14,     s: '',  label: 'weddings this month' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5 }}
      className="relative z-10 max-w-6xl mx-auto px-6 -mt-6"
    >
      <div className="rounded-3xl bg-white/85 backdrop-blur border border-border-light shadow-[0_30px_60px_-30px_rgba(190,90,70,0.35)] p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(it => (
          <div key={it.label} className="text-center">
            <div className="font-brand text-3xl md:text-4xl font-semibold text-rose-main">
              <Counter to={it.n} suffix={it.s} />
            </div>
            <div className="mt-1 text-[12px] uppercase tracking-wider font-semibold text-text-secondary">{it.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── compatibility radar (6 signal bars) ───────────────── */
function CompatibilityCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55 }}
      className="relative rounded-3xl bg-white border border-border-light p-7 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.2)] overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-rose-soft to-rose-light opacity-60 blur-2xl" />
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-main to-rose-dark flex items-center justify-center text-white shadow-lg">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-rose-main">Match Score</div>
          <div className="font-brand text-2xl font-semibold text-text-primary">You &amp; Aanya · 87%</div>
        </div>
      </div>
      <p className="text-[13px] text-text-secondary mb-5">Six honest signals from your Vibe Check, prompts and behaviour.</p>
      <div className="space-y-3">
        {SIGNALS.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center justify-between text-[12.5px] mb-1">
              <span className="inline-flex items-center gap-1.5 font-medium text-text-primary">
                <s.icon className="w-3.5 h-3.5 text-rose-main" /> {s.label}
              </span>
              <span className="font-bold text-rose-main">{s.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-rose-soft/70 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${s.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: 0.1 + i * 0.08, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-rose-main to-rose-dark rounded-full shadow-[0_0_12px_rgba(190,90,70,0.4)]"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── vibe-score circular gauge ─────────────────────────── */
function VibeGauge() {
  const reduce = useReducedMotion();
  const score = 88;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: 0.05 }}
      className="relative rounded-3xl bg-gradient-to-br from-rose-main via-rose-dark to-[#7a3f2b] text-white p-7 shadow-[0_30px_70px_-25px_rgba(190,90,70,0.6)] overflow-hidden"
    >
      <div aria-hidden className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.6), transparent 40%)' }} />
      <div className="relative flex items-center gap-5">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.2)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="50" cy="50" r="42" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              whileInView={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - score / 100) }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-brand text-4xl font-semibold leading-none">{score}</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80 mt-1">Vibe Score</div>
          </div>
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute -inset-2 rounded-full border-2 border-white/30"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-white/85">Your Vibe Card</div>
          <h3 className="font-brand text-2xl font-semibold mt-1">Warm · Curious · Grounded</h3>
          <p className="text-[13px] mt-2 text-white/90 leading-relaxed">A 60-second quiz becomes a living card that helps the right people find you.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Bookshops', 'Hill stations', 'Indie music', 'Slow mornings'].map(c => (
              <span key={c} className="text-[11px] font-semibold bg-white/20 border border-white/30 rounded-full px-2.5 py-1 backdrop-blur-sm">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── date-ideas carousel (horizontal scroll, tilt on hover) */
function DateIdeasStrip() {
  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-6 px-6">
        {DATE_IDEAS.map((d, i) => (
          <motion.div
            key={d.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
            whileHover={{ y: -6, rotateX: 4, rotateY: -4, scale: 1.02 }}
            style={{ transformStyle: 'preserve-3d', perspective: 800 }}
            className="snap-start min-w-[220px] rounded-2xl p-5 text-white shadow-[0_20px_45px_-18px_rgba(0,0,0,0.35)]"
          >
            <div
              className="rounded-2xl p-5 h-full"
              style={{ background: `linear-gradient(135deg, hsl(${d.hue},78%,62%), hsl(${(d.hue + 30) % 360},80%,52%))` }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/25 backdrop-blur flex items-center justify-center">
                <d.icon className="w-5 h-5" />
              </div>
              <div className="mt-4 text-[10.5px] uppercase tracking-wider font-bold text-white/85">{d.tag}</div>
              <div className="font-semibold text-[16px] mt-1 leading-snug">{d.title}</div>
              <div className="mt-3 text-[11.5px] text-white/90 inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Suggested by AI</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── beats preview (3-message conversation w/ typing dots) ─ */
function BeatsPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55 }}
      className="rounded-3xl bg-white border border-border-light p-6 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.2)] relative overflow-hidden"
    >
      <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-gradient-to-br from-rose-soft to-amber-200 opacity-60 blur-2xl" />
      <div className="flex items-center gap-2 mb-4 relative">
        <Flame className="w-4 h-4 text-rose-main" />
        <span className="text-[11px] uppercase tracking-wider font-bold text-rose-main">Beats · day 7 streak</span>
      </div>
      <div className="space-y-2.5 relative">
        <div className="flex gap-2 items-end">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-rose-main flex items-center justify-center text-white text-[10px] font-bold">M</div>
          <div className="bg-rose-soft text-text-primary rounded-2xl rounded-bl-md px-3 py-2 text-[13px] max-w-[78%]">Coffee or chai, what&rsquo;s your monsoon order?</div>
        </div>
        <div className="flex justify-end">
          <div className="bg-gradient-to-r from-rose-main to-rose-dark text-white rounded-2xl rounded-br-md px-3 py-2 text-[13px] max-w-[78%] shadow">Filter coffee. With a tiny piece of dark chocolate.</div>
        </div>
        <div className="flex gap-2 items-end">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-rose-main flex items-center justify-center text-white text-[10px] font-bold">M</div>
          <div className="bg-rose-soft rounded-2xl rounded-bl-md px-3 py-2 text-[13px] inline-flex gap-1 items-center">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-rose-main" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity }} />
            <motion.span className="w-1.5 h-1.5 rounded-full bg-rose-main" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }} />
            <motion.span className="w-1.5 h-1.5 rounded-full bg-rose-main" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── animated headline-word reveal ─────────────────────── */
function RevealWords({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(' ').map((w, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 * i, ease: 'easeOut' }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

/* ── infinite city marquee ─────────────────────────────── */
function CityMarquee() {
  const row = [...CITIES, ...CITIES];
  return (
    <div className="relative overflow-hidden py-6 border-y border-rose-soft/60 bg-white/50 backdrop-blur">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-miamo-bg to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-miamo-bg to-transparent z-10" />
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      >
        {row.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-2 font-brand text-2xl text-text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-main" /> {c}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ── floating emoji burst (decorative) ─────────────────── */
function EmojiBurst() {
  const reduce = useReducedMotion();
  const emojis = ['💖', '✨', '💌', '🌹', '💫'];
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {emojis.map((e, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{ left: `${10 + i * 18}%`, bottom: '-2rem' }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], y: -380, x: i % 2 ? 30 : -30, rotate: i * 25 }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: i * 1.3, ease: 'easeOut' }}
        >
          {e}
        </motion.div>
      ))}
    </div>
  );
}

/* ── phone mockup with rotating profile screen ─────────── */
function PhoneMockup() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI(x => (x + 1) % DECK.length), 3000);
    return () => clearInterval(t);
  }, [reduce]);
  const p = DECK[i];
  const gradient = `linear-gradient(135deg, hsl(${p.hue}, 78%, 70%) 0%, hsl(${(p.hue + 30) % 360}, 80%, 58%) 100%)`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -10 }}
      whileInView={{ opacity: 1, y: 0, rotateY: -6 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1400 }}
      className="relative mx-auto w-[280px]"
    >
      {/* phone frame */}
      <div className="relative rounded-[42px] bg-zinc-900 p-3 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.05)_inset]">
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black z-20" />
        <div className="relative rounded-[32px] overflow-hidden bg-white h-[540px]">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={p.name}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
              style={{ background: gradient }}
            >
              <div className="absolute inset-0 mix-blend-overlay opacity-30"
                style={{ backgroundImage: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.55), transparent 55%)' }} />
              <div className="absolute inset-x-0 top-12 flex items-center justify-center">
                <span className="font-brand text-[180px] text-white/90 drop-shadow">{p.initial}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/55 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-semibold text-2xl">{p.name}</h3><span className="text-white/80">{p.age}</span>
                  <BadgeCheck className="ml-1 w-5 h-5 text-sky-300" />
                </div>
                <div className="text-[12px] text-white/85 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {p.city}</div>
                <p className="text-[13px] mt-2 text-white">{p.blurb}</p>
              </div>
              {/* like / pass icons */}
              <div className="absolute bottom-5 right-5 flex gap-2 z-10">
                <motion.button aria-label="pass" className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
                  whileTap={{ scale: 0.9 }}><span className="text-zinc-400 font-bold">×</span></motion.button>
                <motion.button aria-label="move" className="w-10 h-10 rounded-full bg-rose-main flex items-center justify-center shadow-lg"
                  whileTap={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}>
                  <Heart className="w-4 h-4 text-white fill-white" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {/* match pop-out */}
      <motion.div
        initial={{ opacity: 0, x: 30, rotate: 4 }}
        whileInView={{ opacity: 1, x: 0, rotate: 4 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="absolute -right-10 top-24 bg-white rounded-2xl px-3 py-2.5 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.3)] border border-rose-soft hidden md:flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4 text-rose-main" />
        <div className="text-[11.5px]">
          <div className="font-bold text-text-primary leading-none">It&rsquo;s a match!</div>
          <div className="text-[10px] text-text-secondary mt-0.5">Tap to say hello</div>
        </div>
      </motion.div>
      {/* notification */}
      <motion.div
        initial={{ opacity: 0, x: -30, rotate: -4 }}
        whileInView={{ opacity: 1, x: 0, rotate: -4 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: 0.6, type: 'spring' }}
        className="absolute -left-12 bottom-28 bg-gradient-to-br from-violet-500 to-rose-main text-white rounded-2xl px-3 py-2.5 shadow-[0_18px_40px_-12px_rgba(190,90,70,0.55)] hidden md:flex items-center gap-2"
      >
        <BellRing className="w-4 h-4" />
        <div className="text-[11.5px]">
          <div className="font-bold leading-none">Beat ready</div>
          <div className="text-[10px] opacity-90 mt-0.5">Aanya is waiting</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── lane comparison (Discover vs DTM) ─────────────────── */
function LaneCompare() {
  const lanes = [
    {
      name: 'Discover', tag: 'Casual to serious', accent: 'from-rose-alt to-rose-main',
      icon: Heart,
      items: ['Daily curated matches', 'Beats and Voice Prompts', 'AI Match score', 'Move on at any time'],
    },
    {
      name: 'Date to Marry', tag: 'Marriage-ready', accent: 'from-violet-500 to-rose-dark',
      icon: Shield,
      items: ['Verified intent and background', 'Kundli + family preferences', 'Bio-data and longer prompts', 'Slow, deliberate matching'],
    },
  ];
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {lanes.map((l, i) => (
        <motion.div
          key={l.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, delay: i * 0.1 }}
          whileHover={{ y: -6, rotateX: 3, rotateY: i ? 4 : -4 }}
          style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
          className="relative rounded-3xl bg-white border border-border-light p-7 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.22)] overflow-hidden"
        >
          <div className={`absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br ${l.accent} opacity-25 blur-2xl`} />
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${l.accent} flex items-center justify-center text-white shadow-lg`}>
            <l.icon className="w-5 h-5" />
          </div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-rose-main mt-4">{l.tag}</div>
          <h3 className="font-brand text-2xl font-semibold text-text-primary mt-1">{l.name}</h3>
          <ul className="mt-4 space-y-2">
            {l.items.map(it => (
              <li key={it} className="flex items-start gap-2 text-[13.5px] text-text-primary">
                <span className="w-5 h-5 rounded-full bg-rose-soft text-rose-main flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </span>
                {it}
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  );
}

/* ── safety promise (3 cards w/ animated shield) ───────── */
function SafetyPromise() {
  const items = [
    { icon: BadgeCheck, title: 'Verified humans only', desc: 'Selfie-check on every profile. Bots flagged in minutes.' },
    { icon: EyeOff,     title: 'You control visibility', desc: 'Private album, pause anytime, hide from anyone.' },
    { icon: Lock,       title: 'End-to-end private',     desc: 'Messages encrypted in transit. Never sold, ever.' },
  ];
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, delay: i * 0.08 }}
          whileHover={{ y: -4 }}
          className="relative rounded-3xl bg-white/90 border border-border-light p-6 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.2)]"
        >
          <motion.div
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg mb-3"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4 }}
          >
            <it.icon className="w-5 h-5" />
          </motion.div>
          <h4 className="font-semibold text-text-primary">{it.title}</h4>
          <p className="mt-1 text-[13px] text-text-secondary leading-relaxed">{it.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── FAQ accordion ─────────────────────────────────────── */
function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <motion.div
            key={f.q}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="rounded-2xl bg-white border border-border-light shadow-[0_15px_40px_-25px_rgba(0,0,0,0.2)] overflow-hidden"
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-rose-soft/30 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-[15px] text-text-primary">{f.q}</span>
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
                <ChevronDown className="w-4 h-4 text-rose-main" />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-[14px] text-text-secondary leading-relaxed">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── heartbeat SVG divider ─────────────────────────────── */
function HeartbeatDivider() {
  return (
    <div aria-hidden className="max-w-3xl mx-auto px-6 py-2 opacity-70">
      <svg viewBox="0 0 600 60" className="w-full h-10">
        <motion.path
          d="M0 30 L 120 30 L 140 10 L 160 50 L 180 18 L 200 42 L 220 30 L 380 30 L 400 8 L 420 52 L 440 22 L 460 38 L 480 30 L 600 30"
          stroke="rgb(190,90,70)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 2.2, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
}

/* ═══════════════════════ PAGE ═══════════════════════════ */
export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroParallax = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-x-hidden text-text-primary">
      {/* big background glow */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full opacity-70 pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(201,120,86,0.28), rgba(212,137,106,0.08) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <FloatingBackgroundCards />
      <EmojiBurst />

      {/* NAV */}
      <nav className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-12 h-16 backdrop-blur-md bg-white/75 border-b border-border-light">
        <Link href="/" aria-label="Miamo home">
          <MiamoWordmark height={22} animated={true} />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
          <Link href="/register"><Button size="sm">Join Miamo</Button></Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-10 lg:pt-16 pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
        <motion.div style={{ y: heroParallax }} className="text-center lg:text-left">
          {/* BIG animated wordmark */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="flex justify-center lg:justify-start mb-6"
          >
            <MiamoWordmark height={68} animated={true} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="inline-flex justify-center lg:justify-start mb-5">
            <LiveTicker />
          </motion.div>

          <h1 className="font-brand font-semibold tracking-tight leading-[1.02] text-[44px] sm:text-[56px] lg:text-[72px]">
            <RevealWords text="Find someone" />
            <br />
            <RevealWords text="who" />{' '}
            <span className="italic text-rose-main relative inline-block">
              gets you.
              <motion.span
                aria-hidden
                className="absolute -bottom-2 left-0 right-0 h-[6px] rounded-full bg-gradient-to-r from-rose-main via-rose-dark to-rose-main"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 0.7, ease: 'easeOut' }}
              />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 text-base lg:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            Miamo is a slower, kinder dating app. Intentional matches, daily warmth through{' '}
            <span className="text-rose-main font-semibold">Beats</span>, voice prompts, AI-powered{' '}
            <span className="text-rose-main font-semibold">Vibe Check</span>, and a separate{' '}
            <span className="text-rose-main font-semibold">Date&nbsp;to&nbsp;Marry</span> lane when you&rsquo;re ready for forever.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
          >
            <Link href="/register">
              <Button size="lg" className="min-w-[210px] group shadow-[0_18px_40px_-15px_rgba(190,90,70,0.7)] hover:scale-[1.03] transition-transform">
                Join Miamo <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="min-w-[180px]">I&rsquo;m already in</Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.85 }}
            className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-[12px] font-semibold text-text-secondary"
          >
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-rose-main" /> Verified profiles</div>
            <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-main" /> 280k+ couples</div>
            <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-rose-main" /> 4.8 / 5 on stores</div>
          </motion.div>
        </motion.div>

        <div className="relative pt-4">
          <SwipeDeck />
          <ChatBubblePeek />
          <MatchToast />
        </div>
      </section>

      {/* STATS MARQUEE */}
      <StatsMarquee />

      {/* CITY MARQUEE */}
      <div className="relative z-10 mt-16">
        <CityMarquee />
      </div>

      {/* HOW IT WORKS */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">How Miamo works</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[44px] tracking-tight mt-2">Less swiping. More meeting.</h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: Users,        title: 'Build a profile that sounds like you', desc: 'Chips, prompts, photos, a voice note. We nudge depth, not vanity.', n: '01', hue: 12 },
            { icon: Sparkles,     title: 'See people who actually fit',          desc: 'Six honest signals — values, vibe, intent, activity, AI rank.',     n: '02', hue: 320 },
            { icon: MessageCircle,title: 'Talk every day with Beats',            desc: 'A tiny daily back-and-forth that keeps things warm.',              n: '03', hue: 200 },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -8, rotateX: 3, rotateY: -3 }}
              style={{ transformStyle: 'preserve-3d', perspective: 900 }}
              className="relative rounded-3xl bg-white/90 backdrop-blur border border-border-light p-6 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_70px_-25px_rgba(190,90,70,0.45)] transition-shadow duration-300"
            >
              <span className="absolute top-4 right-5 font-brand text-5xl text-rose-soft font-semibold leading-none">{s.n}</span>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, hsl(${s.hue},78%,62%), hsl(${(s.hue + 30) % 360},80%,52%))` }}>
                <s.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg text-text-primary">{s.title}</h3>
              <p className="mt-2 text-[13.5px] text-text-secondary leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* COMPATIBILITY + VIBE GAUGE (2-col preview) */}
      <section className="relative z-10 bg-gradient-to-b from-transparent via-rose-soft/30 to-transparent py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Real intelligence, real warmth</span>
            <h2 className="font-brand font-semibold text-[34px] lg:text-[44px] tracking-tight mt-2">See why a match actually fits.</h2>
            <p className="mt-3 text-text-secondary max-w-2xl mx-auto text-[14.5px]">No black-box scores. Every match comes with six visible signals and a vibe card you can edit anytime.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            <CompatibilityCard />
            <VibeGauge />
          </div>
        </div>
      </section>

      {/* SIGNATURE FEATURES (8 cards, tilt-on-hover) */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Signature features</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[44px] tracking-tight mt-2">Built for the way you actually fall in love.</h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.06 }}
              whileHover={{ y: -8, rotateX: 6, rotateY: -6, scale: 1.02 }}
              style={{ transformStyle: 'preserve-3d', perspective: 900 }}
              className="group relative rounded-3xl bg-white border border-border-light p-6 shadow-[0_20px_45px_-25px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-22px_rgba(190,90,70,0.45)] transition-shadow"
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-soft to-rose-light flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <f.icon className="w-5 h-5 text-rose-main" />
              </div>
              <h4 className="font-semibold text-[15.5px] text-text-primary">{f.title}</h4>
              <p className="mt-1.5 text-[13px] text-text-secondary leading-relaxed">{f.desc}</p>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: 'linear-gradient(135deg, rgba(201,120,86,0.05) 0%, transparent 60%)',
                }}
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* DATE IDEAS + BEATS PREVIEW */}
      <section className="relative z-10 bg-gradient-to-br from-rose-soft/40 via-white to-amber-100/30 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="mb-10 grid md:grid-cols-2 gap-6 items-end"
          >
            <div>
              <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">First dates, planned for you</span>
              <h2 className="font-brand font-semibold text-[32px] lg:text-[40px] tracking-tight mt-2">Stop debating, start dating.</h2>
              <p className="mt-3 text-text-secondary text-[14.5px] max-w-md">Tell us both of your moods and the city. We&rsquo;ll suggest a date you&rsquo;ll both actually love.</p>
            </div>
            <BeatsPreview />
          </motion.div>
          <DateIdeasStrip />
        </div>
      </section>

      {/* PHONE MOCKUP + LANE COMPARISON */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-12 items-center">
          <div className="order-2 lg:order-1">
            <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Two lanes, your choice</span>
            <h2 className="font-brand font-semibold text-[34px] lg:text-[42px] tracking-tight mt-2">One Miamo. Two journeys.</h2>
            <p className="mt-3 text-text-secondary text-[14.5px] max-w-lg">Whether you&rsquo;re here to meet someone interesting or to find the person you&rsquo;ll marry &mdash; Miamo has a dedicated space for both, with the right pace and the right people.</p>
            <div className="mt-8"><LaneCompare /></div>
          </div>
          <div className="order-1 lg:order-2 relative">
            <div aria-hidden className="absolute -inset-10 bg-gradient-to-br from-rose-soft via-amber-100 to-violet-200 rounded-[60px] blur-3xl opacity-50" />
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Love, in their own words</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[44px] tracking-tight mt-2">Real people. Real beginnings.</h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: (i % 2) * 0.1 }}
              whileHover={{ y: -4 }}
              className="relative rounded-3xl bg-white p-7 border border-border-light shadow-[0_25px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden"
            >
              <Quote className="absolute -top-3 -right-3 w-24 h-24 text-rose-soft" />
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-alt to-rose-main border-2 border-white flex items-center justify-center text-white text-sm font-semibold shadow">{t.name.split(' & ')[0][0]}</div>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-300 to-rose-main border-2 border-white flex items-center justify-center text-white text-sm font-semibold shadow">{t.name.split(' & ')[1][0]}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm text-text-primary">{t.name}</div>
                  <div className="text-[11.5px] text-text-secondary">{t.city} · together {t.months} months</div>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  {[0,1,2,3,4].map(s => <Star key={s} className="w-3.5 h-3.5 fill-rose-main text-rose-main" />)}
                </div>
              </div>
              <blockquote className="relative mt-4 text-[14.5px] leading-relaxed text-text-primary">&ldquo;{t.story}&rdquo;</blockquote>
            </motion.figure>
          ))}
        </div>
      </section>

      <HeartbeatDivider />

      {/* SAFETY PROMISE */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Built on trust</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[42px] tracking-tight mt-2">Your safety is the product.</h2>
          <p className="mt-3 text-text-secondary text-[14.5px] max-w-xl mx-auto">Verified humans, private by default, and you stay in control of who sees what.</p>
        </motion.div>
        <SafetyPromise />
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-rose-main">Questions, answered</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[42px] tracking-tight mt-2">Good to know.</h2>
        </motion.div>
        <FAQ />
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="relative max-w-4xl mx-auto rounded-[32px] overflow-hidden bg-gradient-to-br from-rose-main via-rose-dark to-[#7a3f2b] text-white px-8 sm:px-14 py-16 text-center shadow-[0_40px_80px_-30px_rgba(190,90,70,0.6)]"
        >
          {/* shimmer overlay */}
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5), transparent 35%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4), transparent 40%)' }}
            animate={{ opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
          <Flame className="absolute top-6 left-8 w-6 h-6 text-white/50" />
          <Heart className="absolute bottom-6 right-8 w-6 h-6 text-white/50 fill-white/50" />
          <div className="relative">
            <div className="flex justify-center mb-6">
              <MiamoWordmark height={48} animated={true} />
            </div>
            <h2 className="font-brand font-semibold text-[34px] lg:text-[48px] leading-[1.05] tracking-tight">
              Your person is out there.<br />
              <span className="italic">Make the first move on Miamo.</span>
            </h2>
            <p className="mt-4 text-white/95 max-w-xl mx-auto text-[14.5px] leading-relaxed">Free to join. No bots. No tricks. Just thoughtful people meeting other thoughtful people.</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register">
                <button className="inline-flex items-center justify-center gap-1 h-12 px-8 rounded-2xl bg-white text-rose-main font-bold text-sm min-w-[210px] shadow-[0_18px_40px_-10px_rgba(0,0,0,0.45)] hover:bg-rose-soft hover:scale-[1.03] transition-all duration-300 active:scale-[0.97]">
                  Join Miamo <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/login">
                <button className="inline-flex items-center justify-center gap-1 h-12 px-8 rounded-2xl bg-transparent text-white border-2 border-white/70 font-semibold text-sm min-w-[180px] hover:bg-white/15 hover:border-white transition-all duration-300">
                  I&rsquo;m already in
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border-light bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <MiamoWordmark height={22} animated={false} />
          <div className="flex items-center gap-5 text-[12px] text-text-secondary font-medium">
            <Link href="/privacy" className="hover:text-rose-main">Privacy</Link>
            <Link href="/terms" className="hover:text-rose-main">Terms</Link>
            <Link href="/community-guidelines" className="hover:text-rose-main">Community</Link>
            <Link href="/cookies" className="hover:text-rose-main">Cookies</Link>
          </div>
          <p className="text-[11.5px] text-text-secondary">© {new Date().getFullYear()} Miamo · Made with <Heart className="inline w-3 h-3 text-rose-main fill-rose-main" /> in India</p>
        </div>
      </footer>
    </div>
  );
}
