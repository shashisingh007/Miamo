'use client';

import Link from 'next/link';
import {
  ArrowRight, Compass, MessageCircle, Zap, Shield, Sparkles,
  Heart, Globe, Lock, Eye, Flame,
  HelpCircle, Mail, MapPin, Plus, Minus,
  Palette, Music, Camera, Video, Mic, BookOpen, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

// ─────────────────────────────────────────────────────────────────────────────
// Landing — quiet luxury. One copper orb. Cormorant for emotional moments.
// Editorial 3-pillar layout. No floating emojis. Rose-copper palette only.
// All Link hrefs preserved (/login × 2, /register × 2). No behavior changes.
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden text-text-primary">
      {/* Single ambient copper orb — the only background flourish */}
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-50 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, rgba(201,120,86,0.18), rgba(212,137,106,0.08) 45%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        aria-hidden
        className="absolute top-[60vh] -right-40 w-[600px] h-[600px] rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, rgba(232,168,124,0.14), transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* ─── NAV ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-16 backdrop-blur-md bg-white/60 border-b border-border-light">
        <Link href="/" aria-label="Miamo home">
          <MiamoWordmark height={22} animated={true} />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">Sign In</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 lg:pt-24 lg:pb-32 text-center">
        {/* Animated brand mark — the heart traces the wordmark, then the headline */}
        {/* below resolves the gesture: "Where hearts connect." */}
        <div className="flex flex-col items-center mb-10 animate-fade-in">
          <div className="origin-center scale-90 sm:scale-100 lg:scale-110">
            <MiamoWordmark height={64} animated={true} />
          </div>
          <span
            aria-hidden
            className="mt-7 block h-px w-12 bg-gradient-to-r from-transparent via-rose-main/40 to-transparent"
          />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 backdrop-blur-sm border border-border-light text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary mb-7 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-main" />
          A premium dating platform
        </span>

        <h1 className="font-brand font-semibold tracking-tight leading-[1.02] text-text-primary text-[44px] sm:text-[60px] lg:text-[84px] animate-fade-in-up">
          Where hearts<br />
          <span className="italic text-rose">connect.</span>
        </h1>

        <p className="max-w-xl mx-auto mt-7 text-base lg:text-lg text-text-secondary leading-relaxed animate-fade-in-up">
          Slow down. Find someone whose story rhymes with yours.
          Intentional matching, daily warmth, and space to be your full self —
          designed for people who want something real.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10 animate-fade-in-up">
          <Link href="/register">
            <Button size="lg" className="min-w-[200px]">
              Start your journey
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="lg" className="min-w-[140px]">
              I already have an account
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── EDITORIAL THREE PILLARS — alternating layout ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20 space-y-24 lg:space-y-32">
        <Pillar
          eyebrow="Intentional"
          title="Match with meaning, not muscle memory."
          body="Send a Miamo Move on a specific photo or prompt — a moment that caught your eye, with a thought attached. Matches happen only when someone responds. Every connection starts already three sentences in."
          icon={Sparkles}
        />
        <Pillar
          eyebrow="Warm"
          title="A daily rhythm that keeps the spark alive."
          body="Beats are a soft daily exchange — a photo, a voice note, a single line. Streaks reward presence, not pressure. Conversations that fade on every other app stay alive here."
          icon={Flame}
          reverse
        />
        <Pillar
          eyebrow="Safe"
          title="Privacy by default. Respect by design."
          body="You choose what's visible and to whom. Photo verification, content moderation, and unambiguous reporting tools — quietly working, never in the way."
          icon={Shield}
        />
      </section>

      {/* ─── FEATURE GRID — soft, monochrome rose ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <header className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            More than swiping
          </p>
          <h2 className="font-brand font-semibold text-3xl lg:text-4xl text-text-primary leading-tight">
            Built for connection, not consumption.
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Compass, title: 'Thoughtful discovery', desc: 'Like a photo. Answer a prompt. Send a voice note. Match when they say so.' },
            { icon: Sparkles, title: 'AI that gets you', desc: 'Compatibility you can see. Values, lifestyle, and how you talk — explained.' },
            { icon: Zap, title: 'Daily beats', desc: 'A soft daily exchange to keep warmth alive between bigger conversations.' },
            { icon: MessageCircle, title: 'Quiet, secure chat', desc: 'Voice and video calls, media sharing, disappearing messages — your choice.' },
            { icon: Palette, title: 'Show your craft', desc: 'Photos, music, writing, art. Let people fall for who you actually are.' },
            { icon: Lock, title: 'Serious Mode', desc: 'A separate space when you\'re ready for commitment. Only matched with those who are too.' },
          ].map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
          ))}
        </div>
      </section>

      {/* ─── CREATIVITY STRIP ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
          Express yourself
        </p>
        <h2 className="font-brand font-semibold text-3xl lg:text-4xl text-text-primary leading-tight mb-4">
          Your profile is more than a photo.
        </h2>
        <p className="text-text-secondary max-w-xl mx-auto mb-8">
          Add the things that make you, you. Six dedicated spaces to share what you create and what you love.
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          {[
            { icon: Music, label: 'Music' },
            { icon: Camera, label: 'Photography' },
            { icon: Video, label: 'Videos' },
            { icon: Mic, label: 'Voice' },
            { icon: BookOpen, label: 'Writing' },
            { icon: Palette, label: 'Art' },
          ].map((t) => (
            <span
              key={t.label}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-border-light text-sm text-text-secondary shadow-soft"
            >
              <t.icon className="w-3.5 h-3.5 text-rose" /> {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <header className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            How it works
          </p>
          <h2 className="font-brand font-semibold text-3xl lg:text-4xl text-text-primary leading-tight">
            Three steps. No noise.
          </h2>
        </header>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { step: '01', icon: Eye, title: 'Build your story', desc: 'Photos, prompts, and the things you create. Be specific. Be yourself.' },
            { step: '02', icon: Heart, title: 'Send a real Move', desc: 'React to a moment in someone\'s profile — not a faceless swipe.' },
            { step: '03', icon: Flame, title: 'Keep it alive', desc: 'Daily beats, video calls, shared moments. Slow, warm, real.' },
          ].map((s) => (
            <li key={s.step} className="text-center">
              <span className="block font-brand text-rose text-5xl italic mb-2">{s.step}</span>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-rose-soft flex items-center justify-center">
                <s.icon className="w-5 h-5 text-rose" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-2">{s.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed max-w-[260px] mx-auto">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <header className="text-center mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-3">
            From real people
          </p>
          <h2 className="font-brand font-semibold text-3xl lg:text-4xl text-text-primary leading-tight">
            Quiet beginnings. Lasting things.
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { quote: 'The AI matching found someone who loves hiking and photography just like me. We\'ve been dating for six months.', name: 'Sara K.', location: 'London' },
            { quote: 'I posted guitar covers, and my now-boyfriend sent a thoughtful Move about my playing. That conversation never stopped.', name: 'Priya R.', location: 'Mumbai' },
            { quote: 'Serious Mode changed everything. Matched with someone who wants the same future.', name: 'Alex T.', location: 'Berlin' },
          ].map((t) => (
            <figure
              key={t.name}
              className="rounded-2xl bg-white border border-border-light p-6 shadow-soft hover:shadow-medium transition-shadow duration-300"
            >
              <blockquote className="font-brand text-lg italic text-text-primary leading-snug mb-5">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-rose-soft flex items-center justify-center text-sm font-semibold text-rose">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                  <p className="text-xs text-text-muted">{t.location}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── SAFETY (calm, monochrome) ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <div className="rounded-3xl bg-white border border-border-light p-8 lg:p-12 shadow-soft text-center">
          <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-rose-soft flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose" />
          </div>
          <h2 className="font-brand font-semibold text-2xl lg:text-3xl text-text-primary mb-3">
            Your safety, our quiet priority.
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto mb-8 text-[15px]">
            Verified profiles. Moderated content. Clear reporting. Always on, never in the way.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
            {[
              { text: 'Photo verification', icon: Check },
              { text: 'Content moderation', icon: Shield },
              { text: 'Block & report anytime', icon: Lock },
            ].map((s) => (
              <div
                key={s.text}
                className="flex items-center gap-2 justify-center px-3 py-3 rounded-xl bg-miamo-elevated border border-border-light"
              >
                <s.icon className="w-4 h-4 text-rose" />
                <span className="text-sm font-medium text-text-secondary">{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <header className="text-center mb-10">
          <HelpCircle className="w-6 h-6 text-rose mx-auto mb-3" />
          <h2 className="font-brand font-semibold text-3xl lg:text-4xl text-text-primary leading-tight">
            Questions, gently answered.
          </h2>
        </header>

        <div className="space-y-2">
          {[
            { q: 'Is Miamo free to use?', a: 'Yes. Matching, messaging, and daily beats are free. Premium adds deeper AI insight, unlimited Moves, and priority visibility — when and if you want it.' },
            { q: 'How does AI matching work?', a: 'Our algorithm learns from how you interact — what you like, how you talk, what you make — to suggest people who fit, not just those who scroll past.' },
            { q: 'What makes a Miamo Move different from a like?', a: 'A Move is tied to a specific photo or prompt and carries a short comment. The person sees exactly what caught your eye — and a real conversation tends to follow.' },
            { q: 'Is my data safe?', a: 'End-to-end encrypted messages. We never sell your data. You control every visibility setting and can delete everything any time.' },
            { q: 'Can I use Miamo for serious dating only?', a: 'Turn on Serious Mode. You\'ll only see — and be shown to — others who\'ve done the same.' },
          ].map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="font-brand font-semibold text-4xl lg:text-5xl text-text-primary leading-[1.05] mb-5">
          Ready to find<br />
          <span className="italic text-rose">your person?</span>
        </h2>
        <p className="text-text-secondary mb-10 max-w-md mx-auto">
          Join the people who are done with noise — and ready for something that lasts.
        </p>
        <Link href="/register">
          <Button size="xl" className="min-w-[240px]">
            Get started — it&apos;s free
            <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
        </Link>
        <p className="mt-5 text-[12px] text-text-muted tracking-wide">
          Free to join · No credit card · Delete anytime
        </p>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-border-light bg-white/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div className="col-span-2 md:col-span-1">
              <MiamoWordmark height={20} animated={true} />
              <p className="text-sm text-text-muted mt-4 leading-relaxed max-w-[220px]">
                Where hearts connect. A premium dating platform for meaningful relationships.
              </p>
              <div className="flex gap-2 mt-5">
                <a href="#" aria-label="Website" className="w-9 h-9 rounded-full bg-white border border-border-light flex items-center justify-center hover:border-rose-main/40 hover:text-rose transition-colors text-text-muted">
                  <Globe className="w-4 h-4" />
                </a>
                <a href="#" aria-label="Email" className="w-9 h-9 rounded-full bg-white border border-border-light flex items-center justify-center hover:border-rose-main/40 hover:text-rose transition-colors text-text-muted">
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>

            <FooterCol heading="Product" items={['Features', 'AI matching', 'Daily Beats', 'Creativity', 'Serious Mode', 'Pricing']} />
            <FooterCol heading="Company" items={['About', 'Careers', 'Press', 'Blog', 'Contact']} />
            <FooterCol heading="Support" items={['Help', 'Safety', 'Community guidelines', 'Privacy', 'Terms', 'Cookies']} />
          </div>

          <div className="border-t border-border-light pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-text-muted">&copy; 2026 Miamo. All rights reserved.</p>
            <span className="text-xs text-text-muted flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Global
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal section components — kept local; pure presentational, no behavior.
// ─────────────────────────────────────────────────────────────────────────────

function Pillar({
  eyebrow,
  title,
  body,
  icon: Icon,
  reverse,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
  reverse?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center ${reverse ? 'lg:[&>div:first-child]:order-2' : ''}`}>
      <div className="lg:col-span-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose mb-4">{eyebrow}</p>
        <h3 className="font-brand font-semibold text-3xl lg:text-[44px] leading-[1.1] text-text-primary mb-5">
          {title}
        </h3>
        <p className="text-[17px] text-text-secondary leading-relaxed max-w-[52ch]">{body}</p>
      </div>
      <div className="lg:col-span-5">
        <div className="aspect-[4/5] rounded-3xl bg-gradient-rose-soft border border-border-light shadow-soft flex items-center justify-center relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(circle at 70% 70%, rgba(201,120,86,0.18), transparent 50%)',
            }}
          />
          <div className="relative w-24 h-24 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-medium">
            <Icon className="w-10 h-10 text-rose" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="group rounded-2xl bg-white border border-border-light p-6 shadow-soft hover:shadow-medium hover:border-rose-soft transition-all duration-300">
      <div className="w-10 h-10 rounded-full bg-rose-soft flex items-center justify-center mb-4 group-hover:bg-rose-main group-hover:text-white transition-colors duration-300">
        <Icon className="w-5 h-5 text-rose group-hover:text-white transition-colors duration-300" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl bg-white border border-border-light p-5 open:shadow-soft transition-all duration-200">
      <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
        <span className="text-[15px] font-semibold text-text-primary">{q}</span>
        <span
          aria-hidden
          className="flex-shrink-0 w-7 h-7 rounded-full bg-rose-soft text-rose flex items-center justify-center transition-transform duration-200 group-open:rotate-180"
        >
          <Plus className="w-4 h-4 group-open:hidden" />
          <Minus className="w-4 h-4 hidden group-open:block" />
        </span>
      </summary>
      <p className="mt-4 text-[15px] text-text-secondary leading-relaxed">{a}</p>
    </details>
  );
}

function FooterCol({ heading, items }: { heading: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-text-primary uppercase tracking-[0.18em] mb-4">
        {heading}
      </h4>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item}>
            <a href="#" className="text-sm text-text-muted hover:text-rose transition-colors">
              {item}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
