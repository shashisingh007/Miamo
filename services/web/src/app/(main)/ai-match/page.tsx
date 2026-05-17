'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, Sparkles, Heart, Zap, MessageCircle, Palette, UserPlus, ArrowRight } from 'lucide-react';
import { Card, Badge, Avatar } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth, trackClick } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useToast } from '@/components/ui/toast';

export default function AIMatchPage() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useTrackPageView('ai-match');
  useTrackScrollDepth('ai-match');

  useEffect(() => {
    api.getAiSuggestions().then(res => setSuggestions(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <MiamoLoader text="AI analyzing compatibility..." />;

  return (
    <ErrorBoundary>
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 dark:text-white"><Brain className="w-5 h-5 text-lavender-400" /> AI Match</h1>
        <p className="text-sm text-text-muted mt-1 dark:text-gray-400">Understand why people are recommended to you</p>
      </div>
      <Card className="p-5 border-lavender-400/20">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-lavender-400 shrink-0 mt-0.5" />
          <div><h3 className="text-sm font-semibold">How AI Match Works</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Our AI analyzes compatibility across values, communication style, lifestyle, interests, and relationship intent.
              It learns from your interactions to improve recommendations over time.
            </p>
          </div>
        </div>
      </Card>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Your Top AI Matches</h3>
        {suggestions.length === 0 ? (
          <div className="text-center py-12"><Brain className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No AI suggestions yet. Complete your profile for better matches!</p></div>
        ) : (
          suggestions.map((item: any, i: number) => {
            const user = item.user || item;
            const score = item.score || item.aiScore || 0;
            const photo = user.photos?.[0]?.url || user.photos?.[0];
            const breakdown = item.breakdown || {};
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card hover className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={photo} name={user.displayName || 'User'} size="lg" verified={user.verified} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold">{user.displayName || 'User'}</h4>
                        <Badge>{score}% match</Badge>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {[
                          { icon: Heart, label: 'Interest overlap', key: 'interestOverlap' },
                          { icon: MessageCircle, label: 'Intent alignment', key: 'intentMatch' },
                          { icon: Palette, label: 'Location proximity', key: 'cityBonus' },
                          { icon: Zap, label: 'Activity & profile', key: 'profileScoreBonus' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2">
                            <item.icon className="w-3 h-3 text-text-muted" />
                            <span className="text-[11px] text-text-muted w-32">{item.label}</span>
                            <div className="flex-1 h-1 bg-miamo-elevated rounded-full overflow-hidden">
                              <div className="h-full bg-lavender-400/60 rounded-full" style={{ width: `${Math.min(100, (breakdown[item.key] || 0) * 5)}%` }} />
                            </div>
                            <span className="text-[10px] text-text-muted w-6 text-right">{breakdown[item.key] || '-'}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="default" onClick={() => { api.sendLike(user.id).catch(() => {}); }}><Heart className="w-3 h-3 mr-1" /> Like</Button>
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/profile?id=${user.id}`)}><ArrowRight className="w-3 h-3 mr-1" /> View</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
