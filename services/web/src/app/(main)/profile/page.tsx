'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Edit3, MapPin, Briefcase, Heart, Plus, CheckCircle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, ScoreRing } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { INTEREST_CATEGORIES, PROFILE_PROMPTS } from '@/lib/constants';
import { useAuthStore } from '@/stores';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ bio: '', city: '', profession: '', datingIntent: '' });
  const [saving, setSaving] = useState(false);
  const [showAddInterest, setShowAddInterest] = useState(false);
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newPromptQ, setNewPromptQ] = useState('');
  const [newPromptA, setNewPromptA] = useState('');
  const { updateUser } = useAuthStore();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview immediately (in production, upload to storage then update profile)
    const preview = URL.createObjectURL(file);
    setProfile((prev: any) => ({
      ...prev,
      user: { ...(prev?.user || prev), photos: [{ url: preview }, ...(prev?.user?.photos || prev?.photos || [])] },
    }));
    e.target.value = '';
  };

  const loadProfile = () => {
    setLoading(true);
    api.getMyProfile().then(res => {
      setProfile(res.data);
      const prof = res.data?.profile || res.data || {};
      setEditForm({ bio: prof.bio || '', city: prof.city || '', profession: prof.profession || '', datingIntent: prof.datingIntent || prof.intent || '' });
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadProfile(); }, []);

  if (loading) return <MiamoLoader text="Loading profile..." />;

  if (!profile) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center"><p className="text-text-muted">Could not load profile. Please log in.</p></div>
    </div>
  );

  const user = profile.user || profile;
  const prof = profile.profile || profile;
  const photos = user.photos || profile.photos || [];
  const interests = profile.interests || user.interests || [];
  const prompts = profile.prompts || user.prompts || [];
  const profileScore = prof.profileScore || 70;

  const completionSteps = [
    { label: 'Basic info', done: !!user.displayName },
    { label: 'Photos (3+)', done: photos.length >= 3 },
    { label: 'Bio', done: !!prof.bio },
    { label: 'Interests (5+)', done: interests.length >= 5 },
    { label: 'Prompts (2+)', done: prompts.length >= 2 },
    { label: 'Relationship intent', done: !!prof.intent },
    { label: 'Verification', done: user.verified },
  ];
  const doneCount = completionSteps.filter(s => s.done).length;
  const profilePercent = Math.round((doneCount / completionSteps.length) * 100);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Card className="overflow-hidden">
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <div className="h-32 bg-gradient-to-br from-lavender-400/20 via-miamo-elevated to-violet-deep/20 relative">
          <button onClick={() => coverInputRef.current?.click()} className="absolute top-3 right-3 bg-black/30 backdrop-blur-sm text-gray-900 p-2 rounded-lg hover:bg-black/50 transition-colors"><Camera className="w-4 h-4" /></button>
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4">
            <div className="relative">
              <Avatar src={photos[0]?.url} name={user.displayName || 'User'} size="xl" className="w-24 h-24 text-2xl border-4 border-miamo-card" />
              <button onClick={() => photoInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-lavender-400 rounded-full flex items-center justify-center border-2 border-miamo-card hover:bg-lavender-300 transition-colors"><Camera className="w-3.5 h-3.5 text-gray-900" /></button>
            </div>
            <div className="flex-1 mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{user.displayName}</h1>
                {user.verified && <Badge variant="success">Verified</Badge>}
              </div>
              <p className="text-sm text-text-muted flex items-center gap-2 mt-0.5">
                <span>@{user.username}</span><span>•</span><MapPin className="w-3 h-3" />{prof.city || ''}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => {
              if (editing) {
                setSaving(true);
                api.updateProfile(editForm).then(() => { loadProfile(); updateUser(editForm); setEditing(false); }).catch(() => {}).finally(() => setSaving(false));
              } else {
                setEditing(true);
              }
            }}>
              {editing ? (saving ? 'Saving…' : <><Save className="w-3.5 h-3.5" /> Save</>) : <><Edit3 className="w-3.5 h-3.5" /> Edit</>}
            </Button>
            {editing && <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-2">About</h3>
            {editing ? (
              <div className="space-y-3">
                <div><label className="text-xs text-text-muted">Bio</label><textarea value={editForm.bio} onChange={e => setEditForm(f => ({...f, bio: e.target.value}))} className="input-premium w-full mt-1 text-sm resize-none" rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-text-muted">City</label><input value={editForm.city} onChange={e => setEditForm(f => ({...f, city: e.target.value}))} className="input-premium w-full mt-1 text-sm" /></div>
                  <div><label className="text-xs text-text-muted">Profession</label><input value={editForm.profession} onChange={e => setEditForm(f => ({...f, profession: e.target.value}))} className="input-premium w-full mt-1 text-sm" /></div>
                </div>
                <div><label className="text-xs text-text-muted">Relationship Intent</label><input value={editForm.datingIntent} onChange={e => setEditForm(f => ({...f, datingIntent: e.target.value}))} className="input-premium w-full mt-1 text-sm" placeholder="e.g. Long-term relationship" /></div>
              </div>
            ) : (
              <>
                <p className="text-sm text-text-secondary leading-relaxed">{prof.bio || 'No bio yet'}</p>
                <div className="flex items-center gap-3 mt-3">
                  {prof.intent && <Badge>{prof.intent}</Badge>}
                  {prof.age && <Badge variant="muted">{prof.age}, {prof.city}</Badge>}
                  {prof.profession && <Badge variant="muted"><Briefcase className="w-3 h-3" /> {prof.profession}</Badge>}
                </div>
              </>
            )}
          </Card>

          {(prompts.length > 0 || editing) && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">Prompts</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowAddPrompt(!showAddPrompt)}><Plus className="w-3.5 h-3.5" /> Add</Button>
              </div>
              {showAddPrompt && (
                <div className="mb-3 bg-miamo-elevated/50 rounded-xl p-4 border border-border/30 space-y-2">
                  <select value={newPromptQ} onChange={e => setNewPromptQ(e.target.value)} className="input-premium w-full text-sm">
                    <option value="">Select a prompt…</option>
                    {PROFILE_PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <textarea value={newPromptA} onChange={e => setNewPromptA(e.target.value)} placeholder="Your answer…" className="input-premium w-full text-sm resize-none" rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={!newPromptQ || !newPromptA.trim()} onClick={async () => {
                      const updated = [...prompts, { question: newPromptQ, answer: newPromptA.trim() }];
                      try { await api.updatePrompts(updated); setShowAddPrompt(false); setNewPromptQ(''); setNewPromptA(''); loadProfile(); } catch (e) {}
                    }}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowAddPrompt(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {prompts.map((p: any, i: number) => (
                  <div key={i} className="bg-miamo-elevated/50 rounded-xl p-4 border border-border/30">
                    <p className="text-xs text-text-muted mb-1">{p.question}</p><p className="text-sm text-text-primary">{p.answer}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest: any) => (
                <span key={interest.name || interest} className="px-3 py-1.5 bg-lavender-400/10 text-lavender-300 rounded-full text-xs font-medium">{interest.name || interest}</span>
              ))}
              <button onClick={() => setShowAddInterest(!showAddInterest)} className="px-3 py-1.5 border border-dashed border-border text-text-muted rounded-full text-xs hover:border-lavender-400/50 hover:text-lavender-400 transition-colors"><Plus className="w-3 h-3 inline mr-1" />Add more</button>
            </div>
            {showAddInterest && (
              <div className="mt-3 bg-miamo-elevated/50 rounded-xl p-4 border border-border/30">
                <p className="text-xs text-text-muted mb-2">Select interests to add:</p>
                <div className="flex flex-wrap gap-1.5">
                  {INTEREST_CATEGORIES.filter(ic => !interests.some((i: any) => (i.name || i) === ic)).map(ic => (
                    <button key={ic} onClick={async () => {
                      const updated = [...interests.map((i: any) => i.name || i), ic];
                      try { await api.updateInterests(updated); loadProfile(); } catch (e) {}
                    }} className="px-2.5 py-1 bg-miamo-card border border-border text-text-muted rounded-full text-xs hover:border-lavender-400/50 hover:text-lavender-400 transition-colors">
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 text-center">
            <h3 className="text-sm font-semibold mb-3">Profile Score</h3>
            <div className="flex justify-center mb-3"><ScoreRing score={profilePercent} size={80} strokeWidth={5} /></div>
            <p className="text-sm font-medium text-text-primary">{profilePercent}% Complete</p>
            <p className="text-xs text-text-muted mt-1">{profilePercent >= 70 ? '✓ Matching unlocked!' : `Complete ${70 - profilePercent}% more to unlock matching`}</p>
          </Card>
          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-3">Completion Checklist</h3>
            <div className="space-y-2">
              {completionSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  {step.done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <div className="w-4 h-4 border border-border rounded-full" />}
                  <span className={cn('text-xs', step.done ? 'text-text-secondary' : 'text-text-muted')}>{step.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
