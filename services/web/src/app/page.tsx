'use client';

import Link from 'next/link';
import { ArrowRight, Compass, MessageCircle, Zap, Brain, Shield, Sparkles, Heart, Star, Users, TrendingUp, Check, Globe, Lock, Eye, Flame } from 'lucide-react';
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
          <div className="w-10 h-10 rounded-xl overflow-hidden hover:scale-110 transition-transform">
            <Image src="/logo.png" alt="Miamo" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold text-romantic tracking-tight">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="secondary">Sign In</Button></Link>
          <Link href="/register"><Button className="shimmer-glass">Get Started</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 lg:py-24 text-center">
        <div className="animate-fade-in-up">
          {/* Logo Showcase */}
          <div className="mx-auto mb-8 w-40 h-40 lg:w-52 lg:h-52 animate-float">
            <Image src="/logo.png" alt="Miamo Dating App" width={208} height={208} className="w-full h-full object-contain drop-shadow-2xl" priority />
          </div>

          <div className="inline-flex items-center gap-2 bg-pink-100 text-pink-600 px-5 py-2 rounded-full text-sm font-semibold mb-6 border border-pink-200 shadow-sm">
            <Heart className="w-4 h-4 heartbeat" fill="currentColor" /> Premium Dating Experience
          </div>

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
              <Button size="xl" className="shimmer-glass text-lg hover:scale-105 active:scale-95 transition-transform">
                Start Your Journey <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" size="xl" className="text-lg hover:scale-105 active:scale-95 transition-transform">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: '10K+', label: 'Active Users', icon: Users },
            { value: '85%', label: 'Match Rate', icon: Heart },
            { value: '50+', label: 'Cities', icon: Globe },
            { value: '4.9', label: 'App Rating', icon: Star },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-200/50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <stat.icon className="w-5 h-5 text-pink-500" />
              </div>
              <p className="text-2xl lg:text-3xl font-black text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features - Glass Cards */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl lg:text-4xl font-bold text-center mb-4 text-gray-800">
          More than just swiping <Heart className="inline w-6 h-6 text-pink-500 heartbeat" fill="currentColor" />
        </h2>
        <p className="text-center text-gray-500 mb-12">Every feature designed for meaningful connections</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Compass, title: 'Thoughtful Discovery', desc: 'Like a photo, comment on a prompt, or send a voice note. Match when they respond.', color: 'from-pink-500 to-rose-500' },
            { icon: Brain, title: 'AI Compatibility', desc: 'See why someone is recommended. Values, lifestyle, communication style — explained.', color: 'from-purple-500 to-pink-500' },
            { icon: Zap, title: 'Daily Beats', desc: 'Keep your connection alive with daily streaks. Photos, voice notes, moods, creative moments.', color: 'from-amber-500 to-pink-500' },
            { icon: MessageCircle, title: 'Secure Messages', desc: 'End-to-end chat with voice/video calls, media sharing, and disappearing messages.', color: 'from-blue-500 to-purple-500' },
            { icon: Sparkles, title: 'Creativity Showcase', desc: 'Show who you are beyond photos. Music, art, cooking, travel — let your talents shine.', color: 'from-pink-400 to-rose-400' },
            { icon: Shield, title: 'Privacy First', desc: 'You control visibility. Opt-in search, selective profiles, verification, and safe moderation.', color: 'from-emerald-500 to-teal-500' },
          ].map((feature) => (
            <div
              key={feature.title}
              className="card-3d p-6 hover-lift hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-gray-800">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl lg:text-4xl font-bold text-center mb-4 text-gray-800">
          How {APP_NAME} Works
        </h2>
        <p className="text-center text-gray-500 mb-14">Three simple steps to finding your person</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Create Your Profile', desc: 'Share your story through photos, prompts, and interests. Our AI helps you shine.', icon: Eye },
            { step: '02', title: 'Discover & Connect', desc: 'Browse curated profiles, send thoughtful moves, and start meaningful conversations.', icon: Heart },
            { step: '03', title: 'Build Something Real', desc: 'Keep the spark alive with daily beats, creativity sharing, and video dates.', icon: Flame },
          ].map((item, idx) => (
            <div key={item.step} className="relative text-center group">
              {idx < 2 && (
                <div className="hidden md:block absolute top-10 right-0 w-1/2 h-0.5 bg-gradient-to-r from-pink-300 to-transparent translate-x-full" />
              )}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-50 border border-pink-200/50 flex items-center justify-center mx-auto mb-5 group-hover:scale-110 group-hover:shadow-lg transition-all">
                <item.icon className="w-7 h-7 text-pink-500" />
              </div>
              <span className="text-[11px] font-black text-pink-400 uppercase tracking-[0.2em] mb-2 block">{item.step}</span>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl lg:text-4xl font-bold text-center mb-4 text-gray-800">
          What Makes {APP_NAME} Different
        </h2>
        <p className="text-center text-gray-500 mb-12">Built for people who want more than just another dating app</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {[
            { title: 'AI-Powered Matching', desc: 'Our algorithm learns your preferences from every interaction — who you like, who you pass, and why matches work.', icon: Brain },
            { title: 'Miamo Moves', desc: 'No more awkward first messages. Like a specific photo or prompt and add a thoughtful comment to stand out.', icon: Sparkles },
            { title: 'Serious Mode', desc: 'Looking for something real? Toggle Serious Mode to connect only with people who are ready for commitment.', icon: Lock },
            { title: 'Connection Streaks', desc: 'Daily Beats keep your connections warm. Share photos, moods, and moments to deepen your bond.', icon: TrendingUp },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 p-5 rounded-2xl bg-white/60 border border-pink-100/60 backdrop-blur-sm hover:bg-white/80 hover:border-pink-200 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <item.icon className="w-5 h-5 text-pink-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-gray-800 mb-1">{item.title}</h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl lg:text-4xl font-bold text-center mb-4 text-gray-800">
          Love Stories <Heart className="inline w-5 h-5 text-pink-500" fill="currentColor" />
        </h2>
        <p className="text-center text-gray-500 mb-12">Real connections made on {APP_NAME}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { quote: "The AI matching is incredible — it found someone who loves hiking and photography just like me. We've been dating for 6 months now!", name: 'Sara K.', location: 'London', rating: 5 },
            { quote: "I love the Creativity section. I posted my guitar covers and my now-boyfriend sent me a sweet Miamo Move about my playing. Best feature ever.", name: 'Priya R.', location: 'Mumbai', rating: 5 },
            { quote: "Serious Mode changed everything for me. No more time-wasters — I matched with someone who actually wants the same things in life.", name: 'Alex T.', location: 'Berlin', rating: 5 },
          ].map((testimonial) => (
            <div key={testimonial.name} className="card-3d p-6 hover-lift hover:-translate-y-1 transition-all">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400" fill="currentColor" />
                ))}
              </div>
              <p className="text-[14px] text-gray-600 leading-relaxed mb-5 italic">&ldquo;{testimonial.quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-200 to-rose-200 flex items-center justify-center text-[13px] font-bold text-pink-600">
                  {testimonial.name[0]}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-800">{testimonial.name}</p>
                  <p className="text-[11px] text-gray-400">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Safety & Trust */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
        <div className="card-3d p-8 lg:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 opacity-50" />
          <div className="relative z-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200/50 mx-auto mb-5 flex items-center justify-center">
              <Shield className="w-7 h-7 text-emerald-500" />
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-3 text-gray-800">Your Safety Is Our Priority</h2>
            <p className="text-gray-500 mb-8 max-w-xl mx-auto">Every profile is moderated, every interaction is protected, and you're always in control.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { text: 'Photo Verification', icon: Check },
                { text: 'AI Content Moderation', icon: Shield },
                { text: 'Block & Report Anytime', icon: Lock },
              ].map((safety) => (
                <div key={safety.text} className="flex items-center gap-2.5 justify-center px-4 py-3 rounded-xl bg-white/70 border border-emerald-100">
                  <safety.icon className="w-4 h-4 text-emerald-500" />
                  <span className="text-[13px] font-medium text-gray-700">{safety.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20 text-center">
        <div className="card-3d p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-rose-50 opacity-50" />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4">
              <Image src="/logo-icon.png" alt="Miamo" width={64} height={64} className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold mb-4 text-gray-800">Ready to find your person?</h2>
            <p className="text-gray-500 mb-8">Join thousands already connecting on {APP_NAME}.</p>
            <Link href="/register">
              <Button size="xl" className="shimmer-glass text-lg px-10 hover:scale-105 active:scale-95 transition-transform">
                Get Started Free <Heart className="w-5 h-5 ml-1" fill="currentColor" />
              </Button>
            </Link>
          </div>
        </div>
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
