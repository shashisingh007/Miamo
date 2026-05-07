'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Compass, MessageCircle, Zap, Brain, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-miamo-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 h-16 border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <Image src="/logo.jpg" alt="Miamo" width={32} height={32} className="w-full h-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Sign In</Button></Link>
          <Link href="/register"><Button>Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 lg:py-36 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-lavender-400/10 text-lavender-400 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" /> Now in early access
          </div>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight">
            <span className="text-gradient">{APP_NAME}</span>
            <br />
            <span className="text-text-primary">{APP_TAGLINE}</span>
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-lg text-text-secondary leading-relaxed">
            A premium dating and social platform built for depth, not just appearances. 
            Thoughtful matching, daily connection streaks, creativity showcases, and AI-powered compatibility.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/register"><Button size="lg">Create Your Profile <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link href="/login"><Button variant="outline" size="lg">Sign In</Button></Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-border/30">
        <h2 className="text-2xl lg:text-3xl font-bold text-center mb-12">More than swiping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Compass, title: 'Thoughtful Discovery', desc: 'Like a photo, comment on a prompt, or send a voice note. Match when they respond.' },
            { icon: Brain, title: 'AI Compatibility', desc: 'See why someone is recommended. Values, lifestyle, communication style — explained.' },
            { icon: Zap, title: 'Daily Beats', desc: 'Keep your connection alive with daily streaks. Photos, voice notes, moods, creative moments.' },
            { icon: MessageCircle, title: 'Secure Messages', desc: 'End-to-end designed chat with voice/video calls, media sharing, and disappearing messages.' },
            { icon: Sparkles, title: 'Creativity Showcase', desc: 'Show who you are beyond photos. Music, art, cooking, travel — let your talent shine.' },
            { icon: Shield, title: 'Privacy First', desc: "You control what\u0027s visible. Opt-in search, selective visibility, verification, and safe moderation." },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-premium p-6 card-hover"
            >
              <div className="w-10 h-10 rounded-xl bg-lavender-400/10 flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-lavender-400" />
              </div>
              <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl lg:text-3xl font-bold mb-4">Ready to find something real?</h2>
        <p className="text-text-secondary mb-8">Join thousands already connecting on {APP_NAME}.</p>
        <Link href="/register"><Button size="lg">Get Started Free <ArrowRight className="w-4 h-4" /></Button></Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden">
              <Image src="/logo.jpg" alt="Miamo" width={24} height={24} className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-semibold">{APP_NAME}</span>
          </div>
          <div className="flex gap-6 text-xs text-text-muted">
            <button className="hover:text-text-secondary">Privacy</button>
            <button className="hover:text-text-secondary">Terms</button>
            <button className="hover:text-text-secondary">Safety</button>
            <button className="hover:text-text-secondary">Help</button>
          </div>
          <p className="text-xs text-text-muted">© 2026 {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
