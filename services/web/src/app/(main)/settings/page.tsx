'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Palette, Lock, Globe, Moon, Sun, Monitor, Trash2, Download, LogOut, Check as CheckIcon, Copy, KeyRound, Wifi, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { SettingsSkeleton } from '@/components/ui/skeleton';
import { InputModal, PasswordModal, Toast } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { logError } from '@/lib/logError';
import { useAuthStore, useThemeStore } from '@/stores';
import { useRouter } from 'next/navigation';
import { useTrackPageView, useTrackScrollDepth } from '@/hooks/useTrackActivity';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface ToggleProps { enabled: boolean; onToggle: () => void; }
function Toggle({ enabled, onToggle }: ToggleProps) {
 return (
 <button onClick={onToggle} className={cn('w-10 h-6 rounded-full transition-colors relative', enabled ? 'bg-rose-main' : 'bg-miamo-elevated border border-border')}>
 <motion.div animate={{ x: enabled ? 18 : 2 }} className="absolute top-1 w-4 h-4 rounded-full bg-miamo-card shadow" />
 </button>
 );
}

interface SettingRowProps { label: string; description?: string; children: React.ReactNode; }
function SettingRow({ label, description, children }: SettingRowProps) {
 return (
 <div className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
 <div className="flex-1 min-w-0 pr-4">
 <p className="text-sm text-text-primary">{label}</p>
 {description && <p className="text-xs text-text-muted mt-0.5">{description}</p>}
 </div>
 {children}
 </div>
 );
}

function TwoFactorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 if (!open) return null;
 return (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="fixed inset-x-4 top-[20%] max-w-sm mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-50 p-6 text-center">
 <div className="w-14 h-14 rounded-2xl bg-rose-main/10 flex items-center justify-center mx-auto mb-4">
 <KeyRound className="w-7 h-7 text-rose-main" />
 </div>
 <h3 className="text-base font-bold text-text-primary mb-2">Two-Factor Authentication</h3>
 <p className="text-sm text-text-muted mb-2">Protect your account with an extra layer of security.</p>
 <div className="bg-miamo-elevated rounded-xl p-4 mb-4 border border-border/30">
 <div className="w-32 h-32 bg-miamo-card rounded-xl mx-auto mb-2 flex items-center justify-center border border-border/50">
 <KeyRound className="w-8 h-8 text-text-muted/30" />
 </div>
 <p className="text-xs text-text-muted">Scan with your authenticator app</p>
 </div>
 <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
 <p className="text-xs text-amber-400 font-medium">Coming in the next update</p>
 </div>
 <Button variant="secondary" size="sm" onClick={onClose} className="w-full">Got it</Button>
 </motion.div>
 </>
 );
}

function SessionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 if (!open) return null;
 return (
 <>
 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
 className="fixed inset-x-4 top-[15%] max-w-md mx-auto bg-miamo-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
 <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
 <h3 className="text-sm font-bold text-text-primary">Active Sessions</h3>
 <button onClick={onClose}><X className="w-4 h-4 text-text-muted" /></button>
 </div>
 <div className="p-5 space-y-3">
 <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
 <Wifi className="w-5 h-5 text-emerald-400" />
 <div className="flex-1">
 <p className="text-sm font-medium text-text-primary">Current Browser</p>
 <p className="text-xs text-text-muted">Active now</p>
 </div>
 <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">Active</span>
 </div>
 <p className="text-xs text-text-muted text-center py-2">No other active sessions.</p>
 <Button variant="secondary" size="sm" onClick={onClose} className="w-full">Close</Button>
 </div>
 </motion.div>
 </>
 );
}

const sections = [
 { id: 'account', label: 'Account', icon: User },
 { id: 'privacy', label: 'Privacy & Search', icon: Shield },
 { id: 'notifications', label: 'Notifications', icon: Bell },
 { id: 'appearance', label: 'Appearance', icon: Palette },
 { id: 'preferences', label: 'Preferences', icon: Globe },
 { id: 'safety', label: 'Safety', icon: Lock },
 { id: 'data', label: 'Data & Account', icon: Globe },
];

export default function SettingsPage() {
 const router = useRouter();
 const { clearAuth, user } = useAuthStore();
 const { theme, setTheme } = useThemeStore();
 const [activeSection, setActiveSection] = useState('account');
 const [loading, setLoading] = useState(true);

 useTrackPageView('settings');
 useTrackScrollDepth('settings');
 const [saved, setSaved] = useState(false);
 const [downloading, setDownloading] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [blockList, setBlockList] = useState<any[]>([]);
 const [copiedId, setCopiedId] = useState(false);
 const [emailModal, setEmailModal] = useState(false);
 const [passwordModal, setPasswordModal] = useState(false);
 const [passwordError, setPasswordError] = useState('');
 const [phoneModal, setPhoneModal] = useState(false);
 const [twoFactorModal, setTwoFactorModal] = useState(false);
 const [sessionsModal, setSessionsModal] = useState(false);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; open: boolean }>({ message: '', type: 'info', open: false });
 const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => { setToast({ message, type, open: true }); }, []);

 const [settings, setSettings] = useState({
 searchByName: true, searchByMiamoId: true, searchByCity: false,
 onlineStatus: true, lastActive: true, readReceipts: true, typingIndicator: true,
 matchNotifications: true, messageNotifications: true, beatReminders: true,
 storyNotifications: false, quietHours: false, reduceMotion: false,
 disappearingMessages: false, seriousMode: false, broadcastReceive: true, aiPersonalization: true,
 profileVisibility: 'public' as string, language: 'English', fontSize: 'medium' as string,
 notificationSound: true, autoplayVideos: true, chatBubbleStyle: 'modern' as string, dateFormat: 'relative' as string,
 });

 useEffect(() => {
 api.getSettings().then(res => {
 if (res.data) {
 const s = res.data; const p = s.privacy || {};
 setSettings(prev => ({ ...prev,
 searchByName: p.searchByName ?? prev.searchByName, onlineStatus: p.onlineStatus ?? prev.onlineStatus,
 readReceipts: p.readReceipts ?? prev.readReceipts,
 matchNotifications: s.notifications?.matches ?? prev.matchNotifications,
 messageNotifications: s.notifications?.messages ?? prev.messageNotifications,
 beatReminders: s.notifications?.beats ?? prev.beatReminders,
 storyNotifications: s.notifications?.stories ?? prev.storyNotifications,
 profileVisibility: p.profileVisibility ?? prev.profileVisibility,
 language: s.preferences?.language ?? prev.language, fontSize: s.preferences?.fontSize ?? prev.fontSize,
 notificationSound: s.preferences?.notificationSound ?? prev.notificationSound,
 autoplayVideos: s.preferences?.autoplayVideos ?? prev.autoplayVideos,
 chatBubbleStyle: s.preferences?.chatBubbleStyle ?? prev.chatBubbleStyle,
 dateFormat: s.preferences?.dateFormat ?? prev.dateFormat,
 }));
 }
 }).catch((e) => logError('settings.load', e)).finally(() => setLoading(false));
 }, []);

 const toggle = async (key: keyof typeof settings) => {
 const newVal = !settings[key]; setSettings(s => ({ ...s, [key]: newVal }));
 try {
 const privacyKeys = ['searchByName','searchByMiamoId','searchByCity','onlineStatus','lastActive','readReceipts','typingIndicator','disappearingMessages','seriousMode','broadcastReceive','aiPersonalization'];
 const notifKeys = ['matchNotifications','messageNotifications','beatReminders','storyNotifications'];
 if (privacyKeys.includes(key)) await api.updatePrivacy({ [key]: newVal });
 else if (notifKeys.includes(key)) { const m: Record<string,string> = { matchNotifications:'matches', messageNotifications:'messages', beatReminders:'beats', storyNotifications:'stories' }; await api.updateSettings({ notifications: { [m[key]]: newVal } }); }
 else if (['notificationSound','autoplayVideos'].includes(key)) await api.updateSettings({ preferences: { [key]: newVal } });
 setSaved(true); setTimeout(() => setSaved(false), 1500);
 } catch { setSettings(s => ({ ...s, [key]: !newVal })); }
 };

 const updatePref = async (key: string, value: string) => {
 setSettings(s => ({ ...s, [key]: value }));
 try {
 if (key === 'profileVisibility') await api.updatePrivacy({ profileVisibility: value });
 else await api.updateSettings({ preferences: { [key]: value } });
 setSaved(true); setTimeout(() => setSaved(false), 1500);
 } catch { showToast('Failed to save', 'error'); }
 };

 const copyMiamoId = () => {
 if (user?.username) navigator.clipboard?.writeText(user.username).then(() => {
 setCopiedId(true); showToast('Miamo ID copied!', 'success'); setTimeout(() => setCopiedId(false), 2000);
 });
 };

 const handleDownload = async () => {
 setDownloading(true);
 try {
 const res = await api.exportData();
 const blob = new Blob([JSON.stringify(res.data || res, null, 2)], { type: 'application/json' });
 const url = URL.createObjectURL(blob); const a = document.createElement('a');
 a.href = url; a.download = 'miamo-data-export.json'; a.click(); URL.revokeObjectURL(url);
 showToast('Data exported', 'success');
 } catch { showToast('Export failed', 'error'); }
 setDownloading(false);
 };

 const handleDeactivate = async () => { try { await api.deactivateAccount(); clearAuth(); router.push('/login'); } catch { showToast('Failed', 'error'); } };
 const handleLogout = async () => { try { await api.logout(); } catch {} clearAuth(); router.push('/login'); };
 const handleUnblock = async (userId: string) => { try { await api.unblockUser(userId); setBlockList(prev => prev.filter(b => b.id !== userId)); showToast('Unblocked', 'success'); } catch {} };
 const loadBlockList = () => { api.getBlockList().then(res => setBlockList(res.data || [])).catch((e) => logError('settings.getBlockList', e)); };

 return (
 <ErrorBoundary>
 <div className="max-w-4xl mx-auto p-6">
 <Toast message={toast.message} type={toast.type} open={toast.open} onClose={() => setToast(t => ({...t, open: false}))} />
 <InputModal open={emailModal} onClose={() => setEmailModal(false)} title="Change Email" label="New email" defaultValue={user?.email||''} placeholder="you@example.com" type="email" onSubmit={async v => { try { await api.updateProfile({email:v} as any); showToast('Email updated','success'); } catch { showToast('Failed','error'); } }} submitLabel="Update Email" />
 <InputModal open={phoneModal} onClose={() => setPhoneModal(false)} title="Add Phone" label="Phone number" placeholder="+1 (555) 000-0000" type="tel" onSubmit={async v => { try { await api.updateProfile({phone:v} as any); showToast('Phone added','success'); } catch { showToast('Failed','error'); } }} submitLabel="Save" />
 <PasswordModal open={passwordModal} onClose={() => { setPasswordModal(false); setPasswordError(''); }} error={passwordError} onSubmit={async (cur,pw) => { try { await api.updatePassword({currentPassword:cur,newPassword:pw}); setPasswordModal(false); showToast('Password updated','success'); } catch { setPasswordError('Failed'); } }} />
 <TwoFactorModal open={twoFactorModal} onClose={() => setTwoFactorModal(false)} />
 <SessionsModal open={sessionsModal} onClose={() => setSessionsModal(false)} />

 {loading ? <SettingsSkeleton /> : (<>
 <div className="flex items-center justify-between mb-6">
 <h1 className="text-xl font-bold">Settings</h1>
 <div className="flex items-center gap-2">
 {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Saved</span>}
 <Button variant="danger" size="sm" onClick={handleLogout}><LogOut className="w-3.5 h-3.5" /> Sign Out</Button>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
 <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar">
 {sections.map(s => (
 <button key={s.id} onClick={() => setActiveSection(s.id)} className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all', activeSection === s.id ? 'bg-rose-main/10 text-rose-main' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-elevated/50')}>
 <s.icon className="w-4 h-4" /> {s.label}
 </button>
 ))}
 </nav>

 <Card className="p-6">
 {activeSection === 'account' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Account</h2>
 <SettingRow label="Email" description={user?.email || 'Not set'}><Button variant="ghost" size="sm" onClick={() => setEmailModal(true)}>Change</Button></SettingRow>
 <SettingRow label="Password" description="Last changed 30 days ago"><Button variant="ghost" size="sm" onClick={() => setPasswordModal(true)}>Update</Button></SettingRow>
 <SettingRow label="Miamo ID" description={`@${user?.username || 'user'} \u2014 System-generated, read-only`}><Button variant="ghost" size="sm" onClick={copyMiamoId}>{copiedId ? <><CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy ID</>}</Button></SettingRow>
 <SettingRow label="Phone" description="Not set"><Button variant="ghost" size="sm" onClick={() => setPhoneModal(true)}>Add</Button></SettingRow>
 <SettingRow label="Two-factor authentication" description="Add extra security"><Button variant="ghost" size="sm" onClick={() => setTwoFactorModal(true)}>Enable</Button></SettingRow>
 <SettingRow label="Active sessions" description="1 active session"><Button variant="ghost" size="sm" onClick={() => setSessionsModal(true)}>Manage</Button></SettingRow>
 </div>
 )}

 {activeSection === 'privacy' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Privacy & Search</h2>
 <SettingRow label="Profile visibility" description="Who can see your profile">
 <div className="flex gap-1.5">
 {(['public','matches','private'] as const).map(v => (
 <button key={v} onClick={() => updatePref('profileVisibility',v)} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all', settings.profileVisibility===v ? 'bg-rose-main/10 border-rose-main/30 text-rose-main' : 'border-border text-text-muted')}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
 ))}
 </div>
 </SettingRow>
 <SettingRow label="Searchable by name"><Toggle enabled={settings.searchByName} onToggle={() => toggle('searchByName')} /></SettingRow>
 <SettingRow label="Searchable by Miamo ID"><Toggle enabled={settings.searchByMiamoId} onToggle={() => toggle('searchByMiamoId')} /></SettingRow>
 <SettingRow label="Searchable by city"><Toggle enabled={settings.searchByCity} onToggle={() => toggle('searchByCity')} /></SettingRow>
 <SettingRow label="Online status"><Toggle enabled={settings.onlineStatus} onToggle={() => toggle('onlineStatus')} /></SettingRow>
 <SettingRow label="Last active"><Toggle enabled={settings.lastActive} onToggle={() => toggle('lastActive')} /></SettingRow>
 <SettingRow label="Read receipts"><Toggle enabled={settings.readReceipts} onToggle={() => toggle('readReceipts')} /></SettingRow>
 <SettingRow label="Typing indicator"><Toggle enabled={settings.typingIndicator} onToggle={() => toggle('typingIndicator')} /></SettingRow>
 <SettingRow label="Serious Mode"><Toggle enabled={settings.seriousMode} onToggle={() => toggle('seriousMode')} /></SettingRow>
 <SettingRow label="Receive broadcasts"><Toggle enabled={settings.broadcastReceive} onToggle={() => toggle('broadcastReceive')} /></SettingRow>
 <SettingRow label="AI personalization"><Toggle enabled={settings.aiPersonalization} onToggle={() => toggle('aiPersonalization')} /></SettingRow>
 </div>
 )}

 {activeSection === 'notifications' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Notifications</h2>
 <SettingRow label="Notification sound"><Toggle enabled={settings.notificationSound} onToggle={() => toggle('notificationSound')} /></SettingRow>
 <SettingRow label="Match notifications"><Toggle enabled={settings.matchNotifications} onToggle={() => toggle('matchNotifications')} /></SettingRow>
 <SettingRow label="Message notifications"><Toggle enabled={settings.messageNotifications} onToggle={() => toggle('messageNotifications')} /></SettingRow>
 <SettingRow label="Beat reminders"><Toggle enabled={settings.beatReminders} onToggle={() => toggle('beatReminders')} /></SettingRow>
 <SettingRow label="Story notifications"><Toggle enabled={settings.storyNotifications} onToggle={() => toggle('storyNotifications')} /></SettingRow>
 <SettingRow label="Quiet hours" description="No notifications 11PM\u20137AM"><Toggle enabled={settings.quietHours||false} onToggle={() => toggle('quietHours')} /></SettingRow>
 </div>
 )}

 {activeSection === 'appearance' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Appearance</h2>
 <SettingRow label="Theme" description={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}>
 <div className="flex gap-2">
 {[{ icon: Moon, label: 'dark' as const }, { icon: Sun, label: 'light' as const }, { icon: Monitor, label: 'system' as const }].map(t => (
 <button key={t.label} onClick={() => setTheme(t.label)} className={cn('p-2 rounded-lg border transition-all', theme === t.label ? 'bg-rose-main/10 border-rose-main/30 text-rose-main' : 'border-border text-text-muted')}>
 <t.icon className="w-4 h-4" />
 </button>
 ))}
 </div>
 </SettingRow>
 <SettingRow label="Font size" description={`Current: ${settings.fontSize}`}>
 <div className="flex gap-1.5">
 {[{v:'small',l:'S'},{v:'medium',l:'M'},{v:'large',l:'L'}].map(f => (
 <button key={f.v} onClick={() => updatePref('fontSize',f.v)} className={cn('w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold transition-all', settings.fontSize===f.v ? 'bg-rose-main/10 border-rose-main/30 text-rose-main' : 'border-border text-text-muted')}>{f.l}</button>
 ))}
 </div>
 </SettingRow>
 <SettingRow label="Reduce motion"><Toggle enabled={settings.reduceMotion} onToggle={() => toggle('reduceMotion')} /></SettingRow>
 <SettingRow label="Chat bubble style">
 <div className="flex gap-1.5">
 {(['modern','classic','minimal'] as const).map(s => (
 <button key={s} onClick={() => updatePref('chatBubbleStyle',s)} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all', settings.chatBubbleStyle===s ? 'bg-rose-main/10 border-rose-main/30 text-rose-main' : 'border-border text-text-muted')}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
 ))}
 </div>
 </SettingRow>
 <SettingRow label="Accent color">
 <div className="flex gap-1.5">
 {['bg-rose-main','bg-rose-dark','bg-sky-400','bg-emerald-400','bg-amber-400'].map(c => (
 <div key={c} className={cn('w-5 h-5 rounded-full', c, c === 'bg-rose-main' && 'ring-2 ring-offset-2 ring-offset-miamo-card ring-rose-main')} />
 ))}
 </div>
 </SettingRow>
 </div>
 )}

 {activeSection === 'preferences' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Preferences</h2>
 <SettingRow label="Language" description={settings.language}>
 <select value={settings.language} onChange={e => updatePref('language', e.target.value)} className="bg-miamo-elevated border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none">
 {['English','Hindi','Spanish','French','German','Portuguese','Japanese','Korean','Chinese'].map(l => <option key={l} value={l}>{l}</option>)}
 </select>
 </SettingRow>
 <SettingRow label="Auto-play videos"><Toggle enabled={settings.autoplayVideos} onToggle={() => toggle('autoplayVideos')} /></SettingRow>
 <SettingRow label="Date format">
 <div className="flex gap-1.5">
 {[{v:'relative',l:'2h ago'},{v:'absolute',l:'May 17'},{v:'short',l:'5/17'}].map(d => (
 <button key={d.v} onClick={() => updatePref('dateFormat',d.v)} className={cn('px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all', settings.dateFormat===d.v ? 'bg-rose-main/10 border-rose-main/30 text-rose-main' : 'border-border text-text-muted')}>{d.l}</button>
 ))}
 </div>
 </SettingRow>
 </div>
 )}

 {activeSection === 'safety' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Safety</h2>
 <SettingRow label="Disappearing messages" description="Auto-delete after 24h"><Toggle enabled={settings.disappearingMessages} onToggle={() => toggle('disappearingMessages')} /></SettingRow>
 <SettingRow label="Block list" description={`${blockList.length} blocked`}><Button variant="ghost" size="sm" onClick={loadBlockList}>Manage</Button></SettingRow>
 {blockList.length > 0 && (
 <div className="space-y-2 py-2">
 {blockList.map((b: any) => (
 <div key={b.id} className="flex items-center justify-between bg-miamo-elevated/50 px-3 py-2 rounded-lg">
 <span className="text-xs text-text-secondary">{b.displayName || b.username || b.id}</span>
 <Button variant="ghost" size="sm" onClick={() => handleUnblock(b.id)}>Unblock</Button>
 </div>
 ))}
 </div>
 )}
 <SettingRow label="Safety tips"><Button variant="ghost" size="sm" onClick={() => router.push('/safety')}>Read</Button></SettingRow>
 </div>
 )}

 {activeSection === 'data' && (
 <div className="space-y-1">
 <h2 className="text-base font-semibold mb-4">Data & Account</h2>
 <SettingRow label="Download my data"><Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}><Download className="w-3.5 h-3.5" /> {downloading ? 'Downloading\u2026' : 'Download'}</Button></SettingRow>
 <SettingRow label="Deactivate account" description="Temporarily hide your profile"><Button variant="ghost" size="sm" onClick={handleDeactivate}>Deactivate</Button></SettingRow>
 <SettingRow label="Delete account" description="Permanently delete everything">
 {showDeleteConfirm ? (
 <div className="flex items-center gap-2">
 <span className="text-xs text-red-400">Are you sure?</span>
 <Button variant="danger" size="sm" onClick={async () => { try { await api.deleteAccount(); clearAuth(); router.push('/login'); } catch { showToast('Failed','error'); } }}>Yes, Delete</Button>
 <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
 </div>
 ) : (
 <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
 )}
 </SettingRow>
 <div className="pt-4 border-t border-border/30 mt-4">
 <p className="text-xs text-text-muted">App version: 1.0.0</p>
 <div className="flex gap-3 mt-2 text-xs text-rose-main">
 <a href="/safety" className="hover:underline">Privacy</a>
 <a href="/safety" className="hover:underline">Terms</a>
 <a href="/safety" className="hover:underline">Help</a>
 </div>
 </div>
 </div>
 )}
 </Card>
 </div>
 </>)}
 </div>
 </ErrorBoundary>
 );
}
