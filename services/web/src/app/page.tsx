'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Heart, Sparkles, Shield, MessageCircle, Star,
  Quote, Users, MapPin, Check, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

/* ─────────────────────────────────────────────────────────────
   Landing page — feels like a dating app, not a SaaS docsite.
   - Animated swipe-deck demo
   - Floating profile bubbles drifting in the background
   - Live activity ticker
   - Real-sounding testimonials (couples)
   - Scroll-triggered section transitions
   ───────────────────────────────────────────────────────────── */

type Demo = {
  name: string;
  age: number;
  city: string;
  blurb: string;
  tags: string[];
  hue: number; // background gradient hue
  initial: string;
};

const DECK: Demo[] = [
  { name: 'Aanya',  age: 26, city: 'Bengaluru', blurb: 'Bookshops, biryani, and bouldering on weekends.', tags: ['Books', 'Climbing', 'Coffee'],  hue: 12,  initial: 'A' },
  { name: 'Rohan',  age: 29, city: 'Mumbai',    blurb: 'Indie filmmaker. Looking for someone to argue about scripts with.', tags: ['Cinema', 'Travel'], hue: 200, initial: 'R' },
  { name: 'Meera',  age: 27, city: 'Delhi',     blurb: 'Carnatic vocalist by night, product lead by day.', tags: ['Music', 'Design'], hue: 320, initial: 'M' },
  { name: 'Kabir',  age: 30, city: 'Pune',      blurb: 'Sunday hiker. Loves stand-up, kindness, and proper chai.', tags: ['Hiking', 'Comedy'], hue: 24,  initial: 'K' },
  { name: 'Saira',  age: 25, city: 'Hyderabad', blurb: 'Painter. Believes pets are pre-installed soulmates.', tags: ['Art', 'Pets'], hue: 280, initial: 'S' },
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

const FEATURES = [
  { icon: Heart,         title: 'Miamo Moves',  desc: 'A like with intention — add a line, not just a tap.' },
  { icon: MessageCircle, title: 'Beats',        desc: 'A daily back-and-forth that keeps new connections alive.' },
  { icon: Sparkles,      title: 'AI Match',     desc: 'Six honest signals — not vanity metrics — find people who fit.' },
  { icon: Shield,        title: 'Date to Marry',desc: 'A separate, serious lane. Kundli, bio-data, verified intent.' },
];

/* ── helpers ─────────────────────────────────────────────── */

function ProfileCard({ p, className = '' }: { p: Demo; className?: string }) {
  const gradient = `linear-gradient(135deg, hsl(${p.hue}, 78%, 72%) 0%, hsl(${(p.hue + 30) % 360}, 80%, 62%) 100%)`;
  return (
    <div className={`relative w-[280px] h-[380px] rounded-3xl overflow-hidden shadow-2xl bg-white ${className}`}>
      <div className="absolute inset-0" style={{ background: gradient }} />
      <div className="absolute inset-x-0 top-0 h-[68%] flex items-center justify-center">
        <span className="font-brand text-[140px] font-semibold text-white/85 select-none drop-shadow-md">{p.initial}</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-xl leading-none">{p.name}</h3>
          <span className="text-white/80 text-sm">{p.age}</span>
        </div>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-white/80">
          <MapPin className="w-3 h-3" /> {p.city}
        </div>
        <p className="mt-2.5 text-[12.5px] leading-snug text-white/95">{p.blurb}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {p.tags.map(t => (
            <span key={t} className="text-[10px] font-medium bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 py-0.5">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwipeDeck() {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => {
      setDirection(prev => (prev === 'right' ? 'left' : 'right'));
      setIdx(i => (i + 1) % DECK.length);
    }, 3200);
    return () => clearInterval(t);
  }, [reduceMotion]);

  const top    = DECK[idx];
  const middle = DECK[(idx + 1) % DECK.length];
  const back   = DECK[(idx + 2) % DECK.length];

  return (
    <div className="relative h-[420px] w-[300px] mx-auto" aria-label="Live profile preview">
      <motion.div
        key={`back-${back.name}`}
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: 0.86, y: 28, opacity: 0.5 }}
        style={{ zIndex: 1 }}
      >
        <ProfileCard p={back} />
      </motion.div>
      <motion.div
        key={`mid-${middle.name}`}
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: 0.93, y: 14, opacity: 0.8 }}
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
          exit={{ opacity: 0, x: direction === 'right' ? 360 : -360, rotate: direction === 'right' ? 22 : -22, transition: { duration: 0.55 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <ProfileCard p={top} />
          <motion.div
            key={`stamp-${idx}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1.05, 1.05, 1] }}
            transition={{ duration: 1.4, times: [0, 0.2, 0.7, 1], delay: 1.4 }}
            className={`pointer-events-none absolute top-10 ${direction === 'right' ? 'right-6 rotate-12 text-rose-main border-rose-main bg-rose-soft' : 'left-6 -rotate-12 text-zinc-500 border-zinc-300 bg-white/80'} border-2 rounded-xl px-3 py-1 text-xs font-extrabold uppercase tracking-widest`}
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
            {[0, 1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: `${30 + i * 12}%`, bottom: '36%' }}
                initial={{ opacity: 0, y: 0, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], y: -120 - i * 8, scale: [0.6, 1, 0.9] }}
                transition={{ duration: 1.6, delay: 0.4 + i * 0.12 }}
              >
                <Heart className="w-5 h-5 text-rose-main fill-rose-main drop-shadow" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingBackgroundCards() {
  const reduce = useReducedMotion();
  const bubbles = useMemo(
    () => Array.from({ length: 6 }).map((_, i) => ({
      hue: (i * 53 + 12) % 360,
      initial: ['A', 'R', 'M', 'K', 'S', 'P'][i],
      top: ['8%', '18%', '62%', '74%', '34%', '78%'][i],
      left: ['6%', '88%', '4%', '90%', '14%', '76%'][i],
      delay: i * 0.4,
      size: 56 + (i % 3) * 14,
    })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {bubbles.map((b, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full shadow-xl flex items-center justify-center font-brand font-semibold text-white/90"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            fontSize: b.size * 0.42,
            background: `linear-gradient(135deg, hsl(${b.hue},80%,72%), hsl(${(b.hue + 30) % 360},78%,62%))`,
          }}
          animate={reduce ? {} : { y: [0, -18, 0], rotate: [0, i % 2 ? 4 : -4, 0] }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: b.delay, ease: 'easeInOut' }}
        >
          {b.initial}
        </motion.div>
      ))}
    </div>
  );
}

function LiveTicker() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI(x => (x + 1) % ACTIVITY_LINES.length), 2600);
    return () => clearInterval(t);
  }, [reduce]);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur border border-rose-soft px-3.5 py-1.5 shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-main opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-main" />
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className="text-[11.5px] font-medium text-text-primary"
        >
          {ACTIVITY_LINES[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function ChatBubblePeek() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: -4 }}
      whileInView={{ opacity: 1, y: 0, rotate: -4 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="absolute -left-10 sm:left-2 top-10 hidden sm:block w-[230px] rounded-2xl rounded-bl-md bg-white shadow-xl border border-rose-soft p-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-alt to-rose-main flex items-center justify-center text-white text-[11px] font-semibold">R</div>
        <div className="text-[11px] font-semibold text-text-primary">Rohan · 2m</div>
      </div>
      <p className="mt-2 text-[12.5px] text-text-secondary leading-snug">&ldquo;Okay your bookshelf is dangerous. We need to talk about Calvino.&rdquo;</p>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-rose-main font-semibold"><Check className="w-3 h-3" /> Beat day 3</div>
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
      className="absolute -right-6 sm:right-2 bottom-16 hidden sm:flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-main to-rose-dark text-white px-3.5 py-2 shadow-xl"
    >
      <Sparkles className="w-4 h-4" />
      <div>
        <div className="text-[11px] font-bold leading-none">It&rsquo;s a match!</div>
        <div className="text-[10px] opacity-90 mt-0.5">You and Aanya · say hello</div>
      </div>
    </motion.div>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-x-hidden text-text-primary">
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full opacity-60 pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(201,120,86,0.22), rgba(212,137,106,0.06) 45%, transparent 70%)', filter: 'blur(40px)' }}
      />
      <FloatingBackgroundCards />

      {/* NAV */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-12 h-16 backdrop-blur-md bg-white/65 border-b border-border-light">
        <Link href="/" aria-label="Miamo home">
          <MiamoWordmark height={22} animated={true} />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
          <Link href="/register"><Button size="sm">Join Miamo</Button></Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-12 lg:pt-20 pb-20 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div className="text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex justify-center lg:justify-start mb-5">
            <LiveTicker />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05 }}
            className="font-brand font-semibold tracking-tight leading-[1.02] text-[44px] sm:text-[56px] lg:text-[72px]"
          >
            Find someone<br />
            who <span className="italic text-rose-main">gets you.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-5 text-base lg:text-lg text-text-secondary leading-relaxed max-w-xl mx-auto lg:mx-0"
          >
            Miamo is a slower, kinder dating app. Intentional matches, daily warmth through{' '}
            <span className="text-rose-main font-medium">Beats</span>, and a separate{' '}
            <span className="text-rose-main font-medium">Date&nbsp;to&nbsp;Marry</span> lane when you&rsquo;re ready for forever.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
          >
            <Link href="/register"><Button size="lg" className="min-w-[200px] group">Join Miamo <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></Button></Link>
            <Link href="/login"><Button variant="outline" size="lg" className="min-w-[180px]">I&rsquo;m already in</Button></Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex items-center justify-center lg:justify-start gap-5 text-[11.5px] text-text-muted"
          >
            <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-rose-main" /> Verified profiles</div>
            <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-main" /> 280k+ couples</div>
            <div className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-rose-main" /> 4.8 / 5 on stores</div>
          </motion.div>
        </div>

        <div className="relative">
          <SwipeDeck />
          <ChatBubblePeek />
          <MatchToast />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-rose-main">How Miamo works</span>
          <h2 className="font-brand font-semibold text-[34px] lg:text-[44px] tracking-tight mt-2">Less swiping. More meeting.</h2>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { icon: Users,        title: 'Build a profile that sounds like you', desc: 'Chips, prompts, a few photos. We nudge depth, not vanity.', n: '01' },
            { icon: Sparkles,     title: 'See people who actually fit',          desc: 'Six signals — values, vibe, intent, activity, AI rank.',     n: '02' },
            { icon: MessageCircle,title: 'Talk every day with Beats',            desc: 'A tiny daily back-and-forth that keeps things alive.',      n: '03' },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative rounded-3xl bg-white/80 backdrop-blur border border-border-light p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <span className="absolute top-4 right-5 font-brand text-4xl text-rose-soft font-semibold">{s.n}</span>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-soft to-rose-light flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-rose-main" />
              </div>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURES STRIP */}
      <section className="relative z-10 bg-gradient-to-br from-rose-soft/40 via-white to-rose-soft/30 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="rounded-2xl bg-white/90 border border-border-light p-5 shadow-soft hover:shadow-lg transition"
              >
                <f.icon className="w-5 h-5 text-rose-main mb-3" />
                <h4 className="font-semibold text-[15px]">{f.title}</h4>
                <p className="mt-1.5 text-[12.5px] text-text-secondary leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
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
          <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-rose-main">Love, in their own words</span>
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
              className="relative rounded-3xl bg-white p-7 border border-border-light shadow-soft overflow-hidden"
            >
              <Quote className="absolute -top-3 -right-3 w-24 h-24 text-rose-soft" />
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-alt to-rose-main border-2 border-white flex items-center justify-center text-white text-sm font-semibold">{t.name.split(' & ')[0][0]}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-rose-main border-2 border-white flex items-center justify-center text-white text-sm font-semibold">{t.name.split(' & ')[1][0]}</div>
                </div>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-[11px] text-text-muted">{t.city} · together {t.months} months</div>
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

      {/* FINAL CTA */}
      <section className="relative z-10 px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="relative max-w-4xl mx-auto rounded-[32px] overflow-hidden bg-gradient-to-br from-rose-main via-rose-dark to-[#7a3f2b] text-white px-8 sm:px-14 py-16 text-center shadow-2xl"
        >
          <Flame className="absolute top-6 left-8 w-6 h-6 text-white/40" />
          <Heart className="absolute bottom-6 right-8 w-6 h-6 text-white/40 fill-white/40" />
          <h2 className="font-brand font-semibold text-[34px] lg:text-[48px] leading-[1.05] tracking-tight">
            Your person is out there.<br />
            <span className="italic">Make the first move on Miamo.</span>
          </h2>
          <p className="mt-4 text-white/90 max-w-xl mx-auto text-[14.5px] leading-relaxed">Free to join. No bots. No tricks. Just thoughtful people meeting other thoughtful people.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"><Button size="lg" className="bg-white text-rose-main hover:bg-white/90 min-w-[200px]">Join Miamo <ArrowRight className="ml-1 w-4 h-4" /></Button></Link>
            <Link href="/login"><Button size="lg" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 min-w-[180px]">I&rsquo;m already in</Button></Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border-light bg-white/70 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <MiamoWordmark height={20} animated={false} />
          <div className="flex items-center gap-5 text-[12px] text-text-muted">
            <Link href="/privacy" className="hover:text-rose-main">Privacy</Link>
            <Link href="/terms" className="hover:text-rose-main">Terms</Link>
            <Link href="/community-guidelines" className="hover:text-rose-main">Community</Link>
            <Link href="/cookies" className="hover:text-rose-main">Cookies</Link>
          </div>
          <p className="text-[11px] text-text-muted">© {new Date().getFullYear()} Miamo · Made with <Heart className="inline w-3 h-3 text-rose-main fill-rose-main" /> in India</p>
        </div>
      </footer>
    </div>
  );
}
