'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Compass, MessageCircle, Zap, Brain, Shield, Sparkles, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-miamo-bg relative overflow-hidden">
      {/* Floating Hearts Background */}
      <div className="floating-hearts">
        <span className="heart">💕</span>
        <span className="heart">💗</span>
        <span className="heart">💖</span>
        <span className="heart">💘</span>
        <span className="heart">💝</span>
        <span className="heart">💕</span>
        <span className="heart">💗</span>
        <span className="heart">💖</span>
      </div>

      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-pink-300/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-40 right-20 w-96 h-96 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-rose-300/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />

      {/* Nav - Frosted Glass */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 h-16 frosted border-b border-pink-200/40">
        <div className="flex items-center gap-2.5">
          <motion.div 
            className="w-10 h-10 rounded-xl overflow-hidden"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <Image src="/logo.png" alt="Miamo" width={40} height={40} className="w-full h-full object-contain" />
          </motion.div>
          <span className="text-xl font-bold text-romantic tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="secondary">Sign In</Button></Link>
          <Link href="/register"><Button className="shimmer-glass">Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
          {/* Logo Showcase */}
          <motion.div
            className="mx-auto mb-8 w-40 h-40 lg:w-52 lg:h-52"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Image src="/logo.png" alt="Miamo Dating App" width={208} height={208} className="w-full h-full object-contain drop-shadow-2xl" priority />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-5 py-2 rounded-full text-sm font-semibold mb-6 border border-pink-200 shadow-sm"
          >
            <Heart className="w-4 h-4 heartbeat" fill="currentColor" /> Premium Dating Experience
          </motion.div>

          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight leading-tight">
            <span className="text-romantic">{APP_NAME}</span>
            <br />
            <span className="text-gray-800">Where hearts connect</span>
          </h1>

          <p className="max-w-2xl mx-auto mt-6 text-lg text-gray-600 leading-relaxed">
            A premium dating platform built for real connections. AI-powered matching,
            daily connection streaks, and creativity showcases — all in a beautiful experience.
          </p>

          <div className="flex items-center justify-center gap-4 mt-10">
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="xl" className="shimmer-glass text-lg">
                  Start Your Journey <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/login">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="secondary" size="xl" className="text-lg">
                  Sign In
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features - Glass Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl lg:text-4xl font-bold text-center mb-4 text-gray-800"
        >
          More than just swiping <Heart className="inline w-6 h-6 text-pink-500 heartbeat" fill="currentColor" />
        </motion.h2>
        <p className="text-center text-gray-500 mb-12">Every feature designed for meaningful connections</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Compass, title: 'Thoughtful Discovery', desc: 'Like a photo, comment on a prompt, or send a voice note. Match when they respond.', color: 'from-pink-500 to-rose-500' },
            { icon: Brain, title: 'AI Compatibility', desc: 'See why someone is recommended. Values, lifestyle, communication style — explained.', color: 'from-purple-500 to-pink-500' },
            { icon: Zap, title: 'Daily Beats', desc: 'Keep your connection alive with daily streaks. Photos, voice notes, moods, creative moments.', color: 'from-amber-500 to-pink-500' },
            { icon: MessageCircle, title: 'Secure Messages', desc: 'End-to-end chat with voice/video calls, media sharing, and disappearing messages.', color: 'from-blue-500 to-purple-500' },
            { icon: Sparkles, title: 'Creativity Showcase', desc: 'Show who you are beyond photos. Music, art, cooking, travel — let your talents shine.', color: 'from-pink-400 to-rose-400' },
            { icon: Shield, title: 'Privacy First', desc: 'You control visibility. Opt-in search, selective profiles, verification, and safe moderation.', color: 'from-emerald-500 to-teal-500' },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="card-3d p-6 hover-lift"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card-3d p-12 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 opacity-50" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4">
              <Image src="/logo-icon.png" alt="" width={64} height={64} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">Ready to find your person?</h2>
            <p className="text-gray-500 mb-8">Join thousands already connecting on {APP_NAME}.</p>
            <Link href="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
                <Button size="xl" className="shimmer-glass text-lg px-10">
                  Get Started Free <Heart className="w-5 h-5 ml-1" fill="currentColor" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 frosted border-t border-pink-200/40 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Image src="/logo-icon.png" alt="Miamo" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-bold text-romantic">{APP_NAME}</span>
            <span className="text-xs text-gray-400 ml-2">Premium Dating App</span>
          </div>
          <p className="text-xs text-gray-400">&copy; 2026 {APP_NAME}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
