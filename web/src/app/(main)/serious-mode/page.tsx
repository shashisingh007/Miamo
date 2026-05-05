'use client';

import { useState, useEffect } from 'react';
import { Heart, Shield, CheckCircle, Users, Brain, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Badge, Avatar } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function SeriousModePage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    api.getDiscover({ filter: 'serious' }).then(res => setUsers(res.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <MiamoLoader text="Loading serious connections..." />;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Heart className="w-5 h-5 text-lavender-400" /> Serious Mode</h1>
        <p className="text-sm text-text-muted mt-1">For people looking for long-term relationships and life partners</p>
      </div>
      <Card className="p-5 border-lavender-400/20">
        <h3 className="text-sm font-semibold mb-3">What Serious Mode Offers</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-secondary">
          {[
            { icon: Shield, text: 'Verified-only matches' },
            { icon: Brain, text: 'AI compatibility for long-term potential' },
            { icon: CheckCircle, text: 'Intent-verified profiles' },
            { icon: Lock, text: 'Privacy-first approach' },
            { icon: Users, text: 'Value-based matching' },
            { icon: Heart, text: 'Commitment readiness indicators' },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-2 bg-miamo-elevated/50 p-3 rounded-xl">
              <item.icon className="w-4 h-4 text-lavender-400" /> {item.text}
            </div>
          ))}
        </div>
      </Card>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Serious Mode Profiles</h3>
        {users.length === 0 ? (
          <div className="text-center py-12"><Heart className="w-10 h-10 text-text-muted/30 mx-auto mb-3" /><p className="text-sm text-text-muted">No serious mode profiles found</p></div>
        ) : (
          users.map((user: any) => {
            const photo = user.photos?.[0]?.url || user.photos?.[0];
            const city = user.profile?.city || user.city || '';
            const age = user.profile?.age || user.age || '';
            const profession = user.profile?.profession || '';
            return (
              <Card key={user.id} hover className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar src={photo} name={user.displayName} size="md" verified={user.verified} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{user.displayName}</h4>
                      <Badge variant="info">Serious</Badge>
                      {user.profile?.intent && <Badge variant="success">{user.profile.intent}</Badge>}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{city}{age ? ` • ${age}` : ''}{profession ? ` • ${profession}` : ''}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => router.push('/discover')}>View</Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
