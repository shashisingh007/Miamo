'use client';

import Link from 'next/link';
import {
  ArrowRight, Compass, MessageCircle, Zap, Brain, Shield, Sparkles,
  Heart, Star, Users, Check, Globe, Lock, Eye, Flame,
  HelpCircle, Mail, MapPin, ChevronRight,
  Palette, Music, Camera, Video, Mic, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MiamoWordmark } from '@/components/ui/miamo-logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden">
      {/* Floating Hearts Background */}
      <div className="floating-hearts">
        <span className="heart">♥</span><span className="heart">♥</span>
        <span className="heart">♥</span><span className="heart">♥</span>
        <span className="heart">♥</span><span className="heart">♥</span>
      </div>

      {/* Background orbs */}
      <div className="orb-pink w-[500px] h-[500px] top-[-100px] left-[-80px] opacity-60" />
      <div className="orb-gold w-[600px] h-[600px] top-[100px] right-[-150px] opacity-50" />
      <div className="orb-pink w-[400px] h-[400px] bottom-[100px] left-[30%] opacity-40" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-14 frosted border-b border-rose-soft/30">
        <div className="flex items-center">
          <MiamoWordmark height={22} animated={false} />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="secondary" className="shadow-soft hover:shadow-medium transition-shadow duration-300">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button className="shimmer-glass shadow-button hover:shadow-button-hover transition-shadow duration-300">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-14 pb-10 lg:pt-24 lg:pb-14 text-center">
        <div className="animate-fade-in-up">
          {/* Single animated wordmark — no duplication */}
          <div className="mx-auto mb-8 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-soft/30 to-rose-gold/15 rounded-full blur-3xl scale-150 animate-pulse-slow" />
            <div className="relative z-10">
              <MiamoWordmark height={80} animated={true} />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 glass-rose text-rose px-5 py-2 rounded-full text-sm font-semibold mb-5 shadow-soft">
            <Heart className="w-4 h-4 heartbeat" fill="currentColor" /> Premium Dating Experience
          </div>

          <h1 className="text-3xl lg:text-5xl font-bold tracking-tight leading-tight text-text-primary">
            Where hearts connect
          </h1>

          <p className="max-w-2xl mx-auto mt-5 text-base lg:text-lg text-text-secondary leading-relaxed">
            A premium dating platform built for real connections. AI-powered matching,
            daily connection streaks, and creativity showcases — designed for people
            who want something deeper.
          </p>

          <div className="flex items-center justify-center gap-4 mt-9">
            <Link href="/register">
              <Button size="xl" className="shimmer-glass text-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-spring shadow-button hover:shadow-button-hover">
                Start Your Journey <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="xl" className="text-lg hover:scale-105 active:scale-95 transition-all duration-300 ease-spring shadow-soft hover:shadow-medium">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ STATS BAR ═══ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '10K+', label: 'Active Users', icon: Users },
            { value: '85%', label: 'Match Rate', icon: Heart },
            { value: '50+', label: 'Cities', icon: Globe },
            { value: '4.9', label: 'App Rating', icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="text-center group stat-shimmer">
              <div className="w-10 h-10 rounded-xl glass-rose flex items-center justify-center mx-auto mb-2 group-hover:scale-110 group-hover:shadow-rose transition-all duration-300 ease-spring">
                <stat.icon className="w-4 h-4 text-rose" />
              </div>
              <p className="text-xl lg:text-2xl font-black text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ WHY CHOOSE MIAMO ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          Why Choose <MiamoWordmark height={28} animated={false} />?
        </h2>
        <p className="text-center text-text-muted mb-10 max-w-2xl mx-auto text-sm lg:text-base">
          We&apos;re not another swipe factory. Every feature is thoughtfully crafted
          to foster genuine connections between real people.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: 'AI That Understands You',
              desc: 'Our matching algorithm learns from your interactions — who you like, how you communicate, and what makes relationships last. Better matches over time, not just pretty faces.',
              color: 'from-purple-500 to-rose-main',
            },
            {
              icon: Sparkles,
              title: 'Express Your Full Self',
              desc: 'Photos are just the start. Share your creativity — music, art, cooking, photography. Let people fall for who you really are, not just a curated highlight reel.',
              color: 'from-rose-main to-rose-gold',
            },
            {
              icon: Shield,
              title: 'Safe & Respectful',
              desc: 'Photo verification, AI content moderation, and community guidelines that are actually enforced. You control who sees you and when.',
              color: 'from-emerald-500 to-teal-500',
            },
          ].map((item) => (
            <div key={item.title} className="card-3d p-6 hover-lift group text-center">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:shadow-rose group-hover:scale-110 transition-all duration-300 ease-spring`}>
                <item.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-text-primary">{item.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          More than just swiping <Heart className="inline w-5 h-5 text-rose heartbeat" fill="currentColor" />
        </h2>
        <p className="text-center text-text-muted mb-8 text-sm">Every feature designed for meaningful connections</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-enter">
          {[
            { icon: Compass, title: 'Thoughtful Discovery', desc: 'Like a photo, comment on a prompt, or send a voice note. Match when they respond.', color: 'from-rose-main to-rose-gold' },
            { icon: Brain, title: 'AI Compatibility', desc: 'See why someone is recommended. Values, lifestyle, communication style — explained.', color: 'from-purple-500 to-rose-main' },
            { icon: Zap, title: 'Daily Beats', desc: 'Keep your connection alive with daily streaks. Photos, voice notes, moods.', color: 'from-amber-500 to-rose-gold' },
            { icon: MessageCircle, title: 'Secure Messages', desc: 'End-to-end chat with voice/video calls, media sharing, and disappearing messages.', color: 'from-blue-500 to-purple-500' },
            { icon: Sparkles, title: 'Creativity Showcase', desc: 'Show who you are beyond photos. Music, art, cooking, travel — talents shine.', color: 'from-rose-main to-rose-copper' },
            { icon: Shield, title: 'Privacy First', desc: 'You control visibility. Opt-in search, selective profiles, and safe moderation.', color: 'from-emerald-500 to-teal-500' },
          ].map((feature) => (
            <div key={feature.title} className="card-3d p-5 hover-lift group">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3 shadow-lg group-hover:shadow-rose group-hover:scale-110 transition-all duration-300 ease-spring`}>
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold mb-1.5 text-text-primary">{feature.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ UNIQUE FEATURES — DETAILED ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          Unique to <MiamoWordmark height={28} animated={false} />
        </h2>
        <p className="text-center text-text-muted mb-10 text-sm lg:text-base max-w-2xl mx-auto">
          Features you won&apos;t find anywhere else — designed around how real relationships form.
        </p>

        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Miamo Moves */}
          <div className="card-3d p-6 hover-lift group flex flex-col md:flex-row gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-main to-rose-gold flex items-center justify-center flex-shrink-0 shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Miamo Moves</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                No more generic &ldquo;hey&rdquo; messages. Like a specific photo or answer a prompt,
                then add a thoughtful comment. The other person sees exactly what caught your eye.
                Match only happens when they respond — so every connection starts with intention.
              </p>
            </div>
          </div>

          {/* Daily Beats / Streaks */}
          <div className="card-3d p-6 hover-lift group flex flex-col md:flex-row gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-gold flex items-center justify-center flex-shrink-0 shadow-lg">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Daily Beats & Streaks</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Keep connections warm between conversations. Share a daily photo, voice note,
                mood check-in, or quick thought. Build streaks that show commitment. Connections
                that go silent on other apps thrive here because there&apos;s always a low-pressure
                way to stay in touch.
              </p>
            </div>
          </div>

          {/* Creativity Showcase */}
          <div className="card-3d p-6 hover-lift group flex flex-col md:flex-row gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-rose-main flex items-center justify-center flex-shrink-0 shadow-lg">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Creativity Showcase</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-2">
                Your profile isn&apos;t just photos and bios. Share your talents and passions
                through dedicated media sections:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: Music, label: 'Music' },
                  { icon: Camera, label: 'Photography' },
                  { icon: Video, label: 'Videos' },
                  { icon: Mic, label: 'Podcasts' },
                  { icon: BookOpen, label: 'Writing' },
                  { icon: Palette, label: 'Art' },
                ].map((t) => (
                  <span key={t.label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-miamo-card/80 border border-rose-soft/30 text-xs text-text-secondary">
                    <t.icon className="w-3 h-3 text-rose" />{t.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Serious Mode */}
          <div className="card-3d p-6 hover-lift group flex flex-col md:flex-row gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Serious Mode</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Toggle Serious Mode when you&apos;re ready for commitment. You&apos;ll only see
                and be shown to others who have it enabled too. No time-wasters, no mixed signals —
                just people on the same page about what they want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          How <MiamoWordmark height={28} animated={false} /> Works
        </h2>
        <p className="text-center text-text-muted mb-10 text-sm">Three simple steps to finding your person</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Create Your Profile', desc: 'Share your story through photos, prompts, creativity showcases, and interests. Be authentically you.', icon: Eye },
            { step: '02', title: 'Discover & Connect', desc: 'Browse AI-curated profiles, send thoughtful Miamo Moves, start meaningful conversations.', icon: Heart },
            { step: '03', title: 'Build Something Real', desc: 'Keep the spark alive with daily beats, video calls, and shared creativity.', icon: Flame },
          ].map((item, idx) => (
            <div key={item.step} className="relative text-center group">
              {idx < 2 && (
                <div className="hidden md:block absolute top-8 right-0 w-1/2 h-0.5 bg-gradient-to-r from-rose-gold to-transparent translate-x-full opacity-40" />
              )}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-soft/60 to-rose-gold/15 border border-rose-soft/40 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:shadow-rose transition-all duration-300 ease-spring">
                <item.icon className="w-6 h-6 text-rose" />
              </div>
              <span className="text-[10px] font-black text-rose-gold uppercase tracking-[0.2em] mb-1.5 block">{item.step}</span>
              <h3 className="text-base font-bold text-text-primary mb-1.5">{item.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          Love Stories <Heart className="inline w-5 h-5 text-rose heartbeat" fill="currentColor" />
        </h2>
        <p className="text-center text-text-muted mb-8 text-sm">Real connections made on <MiamoWordmark height={14} animated={false} /></p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger-enter">
          {[
            { quote: "The AI matching found someone who loves hiking and photography just like me. We've been dating for 6 months now!", name: 'Sara K.', location: 'London', rating: 5 },
            { quote: "I posted guitar covers and my now-boyfriend sent a sweet Miamo Move about my playing. Best feature ever!", name: 'Priya R.', location: 'Mumbai', rating: 5 },
            { quote: "Serious Mode changed everything. No more time-wasters — matched with someone who wants the same things.", name: 'Alex T.', location: 'Berlin', rating: 5 },
          ].map((t) => (
            <div key={t.name} className="card-3d p-5 hover-lift group">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-soft to-rose-gold/30 flex items-center justify-center text-[12px] font-bold text-rose shadow-soft">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-text-primary">{t.name}</p>
                  <p className="text-[10px] text-text-muted">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SAFETY ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <div className="card-3d p-6 lg:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 opacity-50" />
          <div className="relative z-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200/50 mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-2 text-text-primary">Your Safety Is Our Priority</h2>
            <p className="text-text-muted mb-6 max-w-xl mx-auto text-sm">
              Every profile is moderated, every interaction is protected. We use AI and human review
              to keep the community safe.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
              {[
                { text: 'Photo Verification', icon: Check },
                { text: 'AI Content Moderation', icon: Shield },
                { text: 'Block & Report Anytime', icon: Lock },
              ].map((s) => (
                <div key={s.text} className="flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl bg-miamo-card/70 border border-emerald-100">
                  <s.icon className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[12px] font-medium text-text-secondary">{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HELP / FAQ ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-3 text-text-primary">
          <HelpCircle className="inline w-6 h-6 text-rose mr-2" />
          Frequently Asked Questions
        </h2>
        <p className="text-center text-text-muted mb-8 text-sm">Got questions? We&apos;ve got answers.</p>

        <div className="space-y-3">
          {[
            { q: 'Is Miamo free to use?', a: 'Yes! Core features like matching, messaging, and daily beats are completely free. Premium unlocks advanced AI insights, unlimited Miamo Moves, and priority visibility.' },
            { q: 'How does AI matching work?', a: 'Our algorithm analyzes your interactions, preferences, and communication patterns to suggest people you\'re genuinely compatible with — beyond just shared interests.' },
            { q: 'What makes Miamo Moves different from liking?', a: 'A Miamo Move is a specific, thoughtful interaction — you like a particular photo or prompt answer and add a personal comment. It shows genuine interest and leads to better conversations.' },
            { q: 'Is my data safe?', a: 'Absolutely. We use end-to-end encryption for messages, never sell your data, and let you control exactly what\'s visible on your profile. You can delete your account and all data at any time.' },
            { q: 'Can I use Miamo for serious dating only?', a: 'Yes! Toggle Serious Mode in your settings to only match with others who are also looking for committed relationships.' },
          ].map((item) => (
            <details key={item.q} className="card-3d p-4 group cursor-pointer">
              <summary className="flex items-center justify-between text-sm font-semibold text-text-primary list-none">
                {item.q}
                <ChevronRight className="w-4 h-4 text-text-muted group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-text-muted leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-12 text-center">
        <div className="card-3d p-8 lg:p-10 relative overflow-hidden glow-border">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-soft/20 to-rose-gold/10 opacity-60" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-gold/20 to-transparent" />
          <div className="relative z-10">
            <div className="mx-auto mb-4">
              <MiamoWordmark height={36} animated={true} />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-3 text-text-primary">Ready to find your person?</h2>
            <p className="text-text-muted mb-6 text-sm">Join thousands already connecting on <MiamoWordmark height={14} animated={false} />.</p>
            <Link href="/register">
              <Button size="xl" className="shimmer-glass text-lg px-10 hover:scale-105 active:scale-95 transition-all duration-300 ease-spring shadow-button hover:shadow-button-hover">
                Get Started Free <Heart className="w-5 h-5 ml-1 heartbeat" fill="currentColor" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ PREMIUM FOOTER ═══ */}
      <footer className="relative z-10 frosted border-t border-rose-soft/20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Footer columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <MiamoWordmark height={20} animated={false} />
              <p className="text-xs text-text-muted mt-3 leading-relaxed max-w-[200px]">
                Where hearts connect. A premium dating platform for meaningful relationships.
              </p>
              <div className="flex gap-3 mt-4">
                <a href="#" className="w-8 h-8 rounded-lg bg-miamo-card border border-rose-soft/20 flex items-center justify-center hover:border-rose-main/40 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-text-muted" />
                </a>
                <a href="#" className="w-8 h-8 rounded-lg bg-miamo-card border border-rose-soft/20 flex items-center justify-center hover:border-rose-main/40 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-text-muted" />
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Product</h4>
              <ul className="space-y-2">
                {['Features', 'AI Matching', 'Daily Beats', 'Creativity', 'Serious Mode', 'Pricing'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-text-muted hover:text-rose transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Company</h4>
              <ul className="space-y-2">
                {['About Us', 'Careers', 'Press', 'Blog', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-text-muted hover:text-rose transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support & Legal */}
            <div>
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">Support</h4>
              <ul className="space-y-2">
                {['Help Center', 'Safety Tips', 'Community Guidelines', 'Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-text-muted hover:text-rose transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-rose-soft/15 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-text-muted">&copy; 2026 <MiamoWordmark height={11} animated={false} />. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[11px] text-text-muted hover:text-rose transition-colors">Privacy</a>
              <a href="#" className="text-[11px] text-text-muted hover:text-rose transition-colors">Terms</a>
              <a href="#" className="text-[11px] text-text-muted hover:text-rose transition-colors">Cookies</a>
              <span className="text-[11px] text-text-muted flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Global
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
