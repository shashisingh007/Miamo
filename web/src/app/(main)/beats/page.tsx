'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Camera, Mic, MessageSquare, Palette, Heart, Clock, Trophy, Flame, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { BEAT_STATES } from '@/lib/constants';
import { cn } from '@/lib/utils';

function BeatCard({ beat, onComplete }: { beat: any; onComplete: () => void }) {
  const state = BEAT_STATES[beat.state as keyof typeof BEAT_STATES] || BEAT_STATES.soft;
  const isUrgent = beat.state === 'critical' || beat.state === 'weak';
  const other = beat.matchedUser || beat.user || {};
  const photo = other.photos?.[0]?.url || other.photos?.[0];
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(beat.todayCompleted || false);

  const handleComplete = async (type?: string) => {
    setCompleting(true);
    try { await api.completeBeat(beat.id, type || 'text', 'Quick beat!'); setDone(true); onComplete(); } catch (e) {}
    setCompleting(false);
  };

  return (
    <Card hover className={cn('p-4', isUrgent && 'border-amber-500/30')}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar src={photo} name={other.displayName || 'User'} size="md" online={other.online} />
          <div className={cn('absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-miamo-bg', state.bg, state.color)}>
            {beat.count || 0}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">{other.displayName || 'User'}</h3>
            <Badge variant={beat.state === 'strong' ? 'success' : beat.state === 'critical' ? 'danger' : 'default'}>{state.label}</Badge>
          </div>
          <p className="text-xs text-text-muted mt-0.5">{beat.count || 0} day streak</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {done ? (
            <Badge variant="success">✓ Done today</Badge>
          ) : (
            <Button size="sm" variant={isUrgent ? 'default' : 'secondary'} onClick={() => handleComplete()} disabled={completing}>
              <Zap className="w-3 h-3" /> {completing ? '…' : 'Send Beat'}
            </Button>
          )}
        </div>
      </div>
      {beat.state === 'critical' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 bg-red-500/10 px-3 py-2 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span className="text-xs text-red-400">Beat expires soon! Send now to keep the streak.</span>
        </motion.div>
      )}
    </Card>
  );
}

function BeatActions({ beats, onComplete }: { beats: any[]; onComplete: () => void }) {
  const actions = [
    { icon: Camera, label: 'Photo', color: 'text-sky-400', type: 'photo' },
    { icon: Mic, label: 'Voice', color: 'text-emerald-400', type: 'voice' },
    { icon: MessageSquare, label: 'Text', color: 'text-lavender-400', type: 'text' },
    { icon: Palette, label: 'Creative', color: 'text-amber-400', type: 'creative' },
    { icon: Heart, label: 'Mood', color: 'text-pink-400', type: 'mood' },
  ];

  const handleQuickBeat = async (type: string) => {
    const activeBeat = beats.find(b => !b.todayCompleted);
    if (activeBeat) {
      try { await api.completeBeat(activeBeat.id, type, `Quick ${type} beat!`); onComplete(); } catch (e) {}
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Beat Actions</h3>
      <div className="grid grid-cols-5 gap-2">
        {actions.map(a => (
          <button key={a.label} onClick={() => handleQuickBeat(a.type)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-miamo-elevated/50 hover:bg-miamo-elevated transition-colors active:scale-95">
            <a.icon className={cn('w-5 h-5', a.color)} /><span className="text-[10px] text-text-muted">{a.label}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export default function BeatsPage() {
  const [beats, setBeats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBeats = () => {
    setLoading(true);
    api.getBeats().then(res => setBeats(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadBeats(); }, []);

  const strongBeats = beats.filter(b => b.state === 'strong').length;
  const longest = beats.reduce((max, b) => Math.max(max, b.count || 0), 0);

  if (loading) return <MiamoLoader text="Loading beats..." />;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Zap className="w-5 h-5 text-lavender-400" /> Beats</h1>
        <p className="text-sm text-text-muted mt-1">Keep your daily connection streaks alive</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Beats', value: beats.length, icon: Flame, color: 'text-lavender-400' },
          { label: 'Longest Streak', value: longest, icon: Trophy, color: 'text-amber-400' },
          { label: 'Strong Beats', value: strongBeats, icon: Clock, color: 'text-emerald-400' },
        ].map(stat => (
          <Card key={stat.label} className="p-4 text-center">
            <stat.icon className={cn('w-5 h-5 mx-auto mb-1', stat.color)} />
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-[11px] text-text-muted">{stat.label}</p>
          </Card>
        ))}
      </div>
      <BeatActions beats={beats} onComplete={loadBeats} />
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary">Your Beats</h3>
        {beats.length === 0 ? (
          <div className="text-center py-12"><Zap className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">Start a Beat streak with your matches!</p></div>
        ) : (
          beats.map((beat, i) => (
            <motion.div key={beat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <BeatCard beat={beat} onComplete={loadBeats} />
            </motion.div>
          ))
        )}
      </div>
      <Card className="p-4 border-lavender-400/20">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-lavender-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">How Beats Work</h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Beats are daily connection streaks between matched users. Both must send a daily interaction to keep the streak alive.
              Miss a day and the Beat weakens. Miss the recovery window and it resets to zero.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
