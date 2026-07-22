'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
 User, Shield, Bell, Palette, Lock, Globe, Moon, Sun, Monitor,
 Trash2, Download, LogOut, Check as CheckIcon, Copy, KeyRound, Wifi, X,
 MessageSquare, Heart, Zap, HelpCircle, Sliders, Languages,
 Eye, EyeOff, Smartphone, Mail, Volume2, Vibrate, Crown, ChevronRight,
 Search as SearchIcon, Sparkles,
} from 'lucide-react';
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
import { usePersistentState } from '@/hooks/usePersistentState';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Portal } from '@/components/ui/portal';
import { AccountDeleteModal } from './components/AccountDeleteModal';
import { BlockListPanel } from './components/BlockListPanel';
import { useI18n } from '@/i18n/useI18n';
import { LOCALE_LABELS, type Locale } from '@/i18n/config';

// ─── Toggle ───────────────────────────────────────────
function Toggle({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label?: string }) {
 return (
  <button
   type="button"
   role="switch"
   aria-checked={enabled}
   aria-label={label}
   onClick={onToggle}
   className={cn(
    'w-10 h-6 rounded-full transition-colors relative shrink-0',
    enabled ? 'bg-rose-main' : 'bg-miamo-elevated dark:bg-[#2A2D34] border border-border dark:border-[#3A3E47]'
   )}
  >
   <motion.div
    animate={{ x: enabled ? 18 : 2 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
   />
  </button>
 );
}

// ─── Setting row ──────────────────────────────────────
function SettingRow({
 label, description, icon: Icon, children,
}: { label: string; description?: string; icon?: any; children: React.ReactNode }) {
 return (
  <div className="flex items-center gap-3 py-3.5 border-b border-border/30 dark:border-[#2A2D34]/60 last:border-0">
   {Icon && (
    <div className="w-8 h-8 rounded-lg bg-rose-soft/50 dark:bg-rose-main/10 flex items-center justify-center shrink-0">
     <Icon className="w-4 h-4 text-rose-main" />
    </div>
   )}
   <div className="flex-1 min-w-0 pr-2">
    <p className="text-sm text-text-primary dark:text-[#F4F1EC]">{label}</p>
    {description && <p className="text-xs text-text-muted dark:text-[#7A746D] mt-0.5">{description}</p>}
   </div>
   <div className="shrink-0">{children}</div>
  </div>
 );
}

// ─── Segmented chip group ─────────────────────────────
function Segmented<T extends string>({
 value, options, onChange,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
 return (
  <div className="flex gap-1 p-0.5 bg-miamo-elevated/60 dark:bg-[#1F2229] border border-border/60 dark:border-[#2A2D34] rounded-lg">
   {options.map((o) => (
    <button
     key={o.value}
     onClick={() => onChange(o.value)}
     className={cn(
      'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all',
      value === o.value
       ? 'bg-white dark:bg-[#2A2D34] text-rose-main shadow-sm'
       : 'text-text-muted dark:text-[#B8B3AC] hover:text-text-secondary dark:hover:text-[#F4F1EC]'
     )}
    >
     {o.label}
    </button>
   ))}
  </div>
 );
}

// ─── Modals ───────────────────────────────────────────
// (TwoFactorModal + row removed in v1 launch — auth service doesn't have
//  a 2FA enrollment flow yet. Bring back once /auth/2fa/enroll ships.)

function SessionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
 if (!open) return null;
 return (
  <Portal>
   <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={onClose} />
   <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
    className="fixed inset-x-4 top-[15%] max-w-md mx-auto bg-miamo-card dark:bg-[#181A1F] border border-border dark:border-[#2A2D34] rounded-2xl shadow-2xl z-50 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/30 dark:border-[#2A2D34]/60">
     <h3 className="text-sm font-bold text-text-primary dark:text-[#F4F1EC]">Active Sessions</h3>
     <button onClick={onClose}><X className="w-4 h-4 text-text-muted" /></button>
    </div>
    <div className="p-5 space-y-3">
     <div className="flex items-center gap-3 p-3 bg-rose-soft/40 dark:bg-rose-main/10 border border-rose-main/15 rounded-xl">
      <Wifi className="w-5 h-5 text-rose-main" />
      <div className="flex-1">
       <p className="text-sm font-medium text-text-primary dark:text-[#F4F1EC]">Current Browser</p>
       <p className="text-xs text-text-muted">Active now</p>
      </div>
      <span className="text-[10px] font-medium text-rose-main bg-rose-soft dark:bg-rose-main/15 px-2 py-1 rounded-full">Active</span>
     </div>
     <p className="text-xs text-text-muted text-center py-2">No other active sessions.</p>
     <Button variant="secondary" size="sm" onClick={onClose} className="w-full">Close</Button>
    </div>
   </motion.div>
  </Portal>
 );
}

// ─── Sections meta ────────────────────────────────────
const sections = [
 { id: 'account', label: 'Account', icon: User, blurb: 'Email, password, identity, security' },
 { id: 'privacy', label: 'Privacy & Visibility', icon: Shield, blurb: 'Who sees you and what they see' },
 // v3.6.0 — Personalization & Privacy consent toggles (mood inference,
 // behavioural ranking, cross-user inference, algorithm transparency).
 { id: 'personalization', label: 'Personalization & Privacy', icon: Sparkles, blurb: 'Consent controls for ranking, mood, and transparency' },
 { id: 'discovery', label: 'Discovery', icon: SearchIcon, blurb: 'Who shows up in your feed' },
 { id: 'communication', label: 'Communication', icon: MessageSquare, blurb: 'Chat, voice, beats behaviour' },
 { id: 'beats', label: 'Beats', icon: Zap, blurb: 'Ephemeral snap rules' },
 { id: 'notifications', label: 'Notifications', icon: Bell, blurb: 'How and when we tap your shoulder' },
 { id: 'appearance', label: 'Appearance', icon: Palette, blurb: 'Theme, density, motion' },
 { id: 'preferences', label: 'Preferences', icon: Sliders, blurb: 'Language, units, formats' },
 { id: 'safety', label: 'Safety', icon: Lock, blurb: 'Blocks, hiding, screenshot guards' },
 { id: 'subscription', label: 'Subscription', icon: Crown, blurb: 'Plan, billing, premium features' },
 { id: 'help', label: 'Help & Feedback', icon: HelpCircle, blurb: 'Support, bug reports, what’s new' },
 { id: 'data', label: 'Data & Account', icon: Globe, blurb: 'Export, deactivate, delete' },
] as const;

type SectionId = (typeof sections)[number]['id'];

// ─── localStorage prefs (UI-only) ─────────────────────
const LOCAL_KEY = 'miamo-local-prefs-v1';
type LocalPrefs = {
 fontSize: 'small' | 'medium' | 'large';
 reduceMotion: boolean;
 chatBubbleStyle: 'modern' | 'classic' | 'minimal';
 dateFormat: 'relative' | 'absolute' | 'short';
 timeFormat: '12h' | '24h';
 distanceUnit: 'mi' | 'km';
 sidebarDensity: 'comfortable' | 'compact';
 sendOnEnter: boolean;
 autoTranslate: boolean;
 spellCheck: boolean;
 voiceMessageAutoplay: boolean;
 emailNotifs: boolean;
 pushNotifs: boolean;
 inAppSounds: boolean;
 vibrate: boolean;
 colorBlindMode: 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia';
 defaultTab: 'discover' | 'matches' | 'messages' | 'beats';
 verifiedOnly: boolean;
 hidePassed: boolean;
 hideMyContacts: boolean;
 autoSaveMyBeats: boolean;
 screenshotWarning: boolean;
 replayConfirm: boolean;
 blockChatScreenshots: boolean;
 hideFromContacts: boolean;
 photoVerificationOnly: boolean;
 incognitoMode: boolean;
 quietHours: boolean;
 disappearingMessages: boolean;
 broadcastReceive: boolean;
};

const DEFAULT_LOCAL: LocalPrefs = {
 fontSize: 'medium', reduceMotion: false, chatBubbleStyle: 'modern',
 dateFormat: 'relative', timeFormat: '12h', distanceUnit: 'mi',
 sidebarDensity: 'comfortable', sendOnEnter: true, autoTranslate: false,
 spellCheck: true, voiceMessageAutoplay: false,
 emailNotifs: true, pushNotifs: true, inAppSounds: true, vibrate: true,
 colorBlindMode: 'off', defaultTab: 'discover',
 verifiedOnly: false, hidePassed: true, hideMyContacts: true,
 autoSaveMyBeats: false, screenshotWarning: true, replayConfirm: true,
 blockChatScreenshots: false, hideFromContacts: true, photoVerificationOnly: false,
 incognitoMode: false,
 quietHours: false, disappearingMessages: false, broadcastReceive: true,
};

function loadLocal(): LocalPrefs {
 if (typeof window === 'undefined') return DEFAULT_LOCAL;
 try { return { ...DEFAULT_LOCAL, ...JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') }; }
 catch { return DEFAULT_LOCAL; }
}
function saveLocal(p: LocalPrefs) {
 if (typeof window !== 'undefined') {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event('miamo-local-prefs-changed'));
 }
}

// ─── Page ─────────────────────────────────────────────
export default function SettingsPage() {
 const router = useRouter();
 const { clearAuth, user } = useAuthStore();
 const { theme, setTheme } = useThemeStore();
 // Phase G.13 — client-side i18n locale (English / Hindi / Tamil / Bengali).
 // Persisted to localStorage under `miamo.locale`; independent from the
 // legacy server-side language pref which we keep for backward-compat.
 const { locale, setLocale, locales } = useI18n();
 const [activeSection, setActiveSection] = usePersistentState<SectionId>('settings:activeSection', 'account');
 const [loading, setLoading] = useState(true);

 useTrackPageView('settings');
 useTrackScrollDepth('settings');

 const [saved, setSaved] = useState(false);
 const [downloading, setDownloading] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [deleteSubmitting, setDeleteSubmitting] = useState(false);
 const [blockList, setBlockList] = useState<any[]>([]);
 const [blockCount, setBlockCount] = useState<number>(0);
 const [showBlockList, setShowBlockList] = useState(false);
 const [copiedId, setCopiedId] = useState(false);
 const [emailModal, setEmailModal] = useState(false);
 const [passwordModal, setPasswordModal] = useState(false);
 const [passwordError, setPasswordError] = useState('');
 const [phoneModal, setPhoneModal] = useState(false);
 const [sessionsModal, setSessionsModal] = useState(false);
 const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; open: boolean }>({ message: '', type: 'info', open: false });
 const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
  setToast({ message, type, open: true });
 }, []);

 const [server, setServer] = useState({
  searchByName: true, searchByMiamoId: true, searchByCity: false,
  onlineStatus: true, lastActive: true, readReceipts: true, typingIndicator: true,
  matchNotifications: true, messageNotifications: true, beatReminders: true,
  storyNotifications: false,
  seriousMode: false, aiPersonalization: true,
  profileVisibility: 'public' as string, language: 'English',
  // v3.6.0 consent toggles — defaults match the API/spec contract.
  moodInferenceEnabled: false,
  behavioralRankingEnabled: true,
  crossUserInferenceEnabled: true,
  algorithmicTransparency: true,
 });
 const [local, setLocal] = useState<LocalPrefs>(DEFAULT_LOCAL);
 useEffect(() => { setLocal(loadLocal()); }, []);
 const setLocalPref = useCallback(<K extends keyof LocalPrefs>(k: K, v: LocalPrefs[K]) => {
  setLocal((prev) => { const next = { ...prev, [k]: v }; saveLocal(next); return next; });
  setSaved(true); setTimeout(() => setSaved(false), 1200);
 }, []);
 const toggleLocal = useCallback((k: keyof LocalPrefs) => {
  setLocal((prev) => { const next = { ...prev, [k]: !prev[k] } as LocalPrefs; saveLocal(next); return next; });
  setSaved(true); setTimeout(() => setSaved(false), 1200);
 }, []);

 useEffect(() => {
  api.getSettings().then((res) => {
   if (res.data) {
    const s: any = res.data;
    const p = s.privacy || {};
    // The backend returns { settings, privacy } nested; older callers also
    // read top-level keys. Read consent toggles from either shape for safety.
    const cfg = s.settings || s;
    setServer((prev) => ({
     ...prev,
     searchByName: p.searchByName ?? prev.searchByName,
     searchByMiamoId: p.miamoIdSearchable ?? prev.searchByMiamoId,
     searchByCity: p.citySearchable ?? prev.searchByCity,
     onlineStatus: p.onlineStatus ?? prev.onlineStatus,
     readReceipts: p.readReceipts ?? prev.readReceipts,
     typingIndicator: p.typingIndicator ?? prev.typingIndicator,
     matchNotifications: s.notifications?.matches ?? prev.matchNotifications,
     messageNotifications: s.notifications?.messages ?? prev.messageNotifications,
     beatReminders: s.notifications?.beats ?? prev.beatReminders,
     storyNotifications: s.notifications?.stories ?? prev.storyNotifications,
     profileVisibility: p.profileVisibility ?? prev.profileVisibility,
     language: s.preferences?.language ?? prev.language,
     // v3.6.0 consent toggles — server is the source of truth.
     moodInferenceEnabled: cfg?.moodInferenceEnabled ?? prev.moodInferenceEnabled,
     behavioralRankingEnabled: cfg?.behavioralRankingEnabled ?? prev.behavioralRankingEnabled,
     crossUserInferenceEnabled: cfg?.crossUserInferenceEnabled ?? prev.crossUserInferenceEnabled,
     algorithmicTransparency: cfg?.algorithmicTransparency ?? prev.algorithmicTransparency,
    }));
   }
  }).catch((e) => logError('settings.load', e)).finally(() => setLoading(false));
 }, []);

 // click-matrix.md §5 rank 16: was rolling back silently — the toggle
 // visually reverted but the user had no idea why. Now toast on failure.
 const toggleServer = async (key: keyof typeof server) => {
  const newVal = !server[key];
  setServer((s) => ({ ...s, [key]: newVal }));
  try {
   const privacyKeys = ['searchByName', 'searchByMiamoId', 'searchByCity', 'onlineStatus', 'lastActive', 'readReceipts', 'typingIndicator', 'seriousMode', 'aiPersonalization'];
   const notifKeys = ['matchNotifications', 'messageNotifications', 'beatReminders', 'storyNotifications'];
   // v3.6.0 — consent toggles persist via PUT /api/v1/settings.
   const consentKeys = ['moodInferenceEnabled', 'behavioralRankingEnabled', 'crossUserInferenceEnabled', 'algorithmicTransparency'];
   if (privacyKeys.includes(key as string)) await api.updatePrivacy({ [key]: newVal });
   else if (notifKeys.includes(key as string)) {
    const m: Record<string, string> = { matchNotifications: 'matches', messageNotifications: 'messages', beatReminders: 'beats', storyNotifications: 'stories' };
    await api.updateSettings({ notifications: { [m[key as string]]: newVal } });
   } else if (consentKeys.includes(key as string)) {
    await api.updateSettings({ [key]: newVal } as any);
   }
   setSaved(true); setTimeout(() => setSaved(false), 1500);
  } catch (e) {
   logError('settings.toggleServer', e);
   setServer((s) => ({ ...s, [key]: !newVal }));
   showToast('Could not save — please try again', 'error');
  }
 };

 const updatePref = async (key: 'profileVisibility' | 'language', value: string) => {
  setServer((s) => ({ ...s, [key]: value }));
  try {
   if (key === 'profileVisibility') await api.updatePrivacy({ profileVisibility: value });
   else await api.updateSettings({ preferences: { [key]: value } });
   setSaved(true); setTimeout(() => setSaved(false), 1500);
  } catch { showToast('Failed to save', 'error'); }
 };

 const copyMiamoId = () => {
  if (user?.username) navigator.clipboard?.writeText(user.username).then(() => {
   setCopiedId(true);
   showToast('Miamo ID copied!', 'success');
   setTimeout(() => setCopiedId(false), 2000);
  });
 };

 const handleDownload = async () => {
  setDownloading(true);
  try {
   const res = await api.exportData();
   const payload = res.data || res;
   const json = JSON.stringify(payload, null, 2);
   const blob = new Blob([json], { type: 'application/json' });
   const url = URL.createObjectURL(blob); const a = document.createElement('a');
   const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
   a.href = url; a.download = `miamo-data-export-${stamp}.json`; a.click(); URL.revokeObjectURL(url);
   // Phase F — funnel signal for data-export completion. Bounded values so
   // the v6 validator accepts even large exports without leaking bytes-exact.
   try {
    const track = (await import('@/lib/track')).track;
    const tableCount = payload && typeof payload === 'object' ? Object.keys(payload).length : 0;
    track('account.export_downloaded', {
     bytes: Math.min(blob.size, 1024 * 1024 * 200),
     tables: Math.min(tableCount, 50),
    });
   } catch { /* tracking best-effort */ }
   showToast('Data exported', 'success');
  } catch (e) {
   logError('settings.exportData', e);
   showToast('Export failed', 'error');
  }
  setDownloading(false);
 };

 const handleDeactivate = async () => {
  try { await api.deactivateAccount(); clearAuth(); router.push('/login'); }
  catch { showToast('Failed', 'error'); }
 };
 const handleLogout = async () => { try { await api.logout(); } catch {} clearAuth(); router.push('/login'); };

 const activeMeta = useMemo(() => sections.find((s) => s.id === activeSection)!, [activeSection]);

 return (
  <ErrorBoundary>
   <div className="min-h-screen bg-bg dark:bg-[#0E0F12] transition-colors">
    <div className="max-w-5xl mx-auto px-6 pt-8 pb-16">
     <Toast message={toast.message} type={toast.type} open={toast.open} onClose={() => setToast((t) => ({ ...t, open: false }))} />
     <InputModal open={emailModal} onClose={() => setEmailModal(false)} title="Change Email" label="New email" defaultValue={user?.email || ''} placeholder="you@example.com" type="email" onSubmit={async (v) => { try { await api.updateProfile({ email: v } as any); showToast('Email updated', 'success'); } catch { showToast('Failed', 'error'); } }} submitLabel="Update Email" />
     <InputModal open={phoneModal} onClose={() => setPhoneModal(false)} title="Add Phone" label="Phone number" placeholder="+1 (555) 000-0000" type="tel" onSubmit={async (v) => { try { await api.updateProfile({ phone: v } as any); showToast('Phone added', 'success'); } catch { showToast('Failed', 'error'); } }} submitLabel="Save" />
     <PasswordModal open={passwordModal} onClose={() => { setPasswordModal(false); setPasswordError(''); }} error={passwordError} onSubmit={async (cur, pw) => { try { await api.updatePassword({ currentPassword: cur, newPassword: pw }); setPasswordModal(false); showToast('Password updated', 'success'); } catch { setPasswordError('Failed'); } }} />
     <SessionsModal open={sessionsModal} onClose={() => setSessionsModal(false)} />
     <AccountDeleteModal
      open={showDeleteConfirm}
      submitting={deleteSubmitting}
      username={user?.username || null}
      onCancel={() => setShowDeleteConfirm(false)}
      onDeactivate={async () => { setShowDeleteConfirm(false); await handleDeactivate(); }}
      onConfirm={async (payload) => {
       setDeleteSubmitting(true);
       const t0 = Date.now();
       try {
        await api.deleteAccount(payload);
        try {
         const track = (await import('@/lib/track')).track;
         track('account.delete_completed', { elapsedMs: Date.now() - t0 });
        } catch { /* tracking best-effort */ }
        clearAuth();
        router.push('/login');
       } catch (e) {
        logError('settings.deleteAccount', e);
        showToast('Delete failed. Please try again.', 'error');
        setDeleteSubmitting(false);
       }
      }}
     />

     {loading ? <SettingsSkeleton /> : (<>
      {/* Hero */}
      <div className="flex items-end justify-between mb-8">
       <div>
        <h1 className="font-brand font-semibold text-3xl md:text-4xl text-text-primary dark:text-[#F4F1EC] tracking-tight">Settings</h1>
        <p className="text-sm text-text-muted dark:text-[#7A746D] mt-1">Tune Miamo to your liking. Changes save instantly.</p>
       </div>
       <div className="flex items-center gap-3">
        {saved && (
         <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-rose-main flex items-center gap-1">
          <CheckIcon className="w-3 h-3" /> Saved
         </motion.span>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-3.5 h-3.5" /> Sign out</Button>
       </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
       {/* Left rail */}
       <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar">
        {sections.map((s) => (
         <button
          key={s.id}
          onClick={() => setActiveSection(s.id)}
          className={cn(
           'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all text-left lg:w-full',
           activeSection === s.id
            ? 'bg-rose-main/10 text-rose-main'
            : 'text-text-muted dark:text-[#B8B3AC] hover:text-text-secondary dark:hover:text-[#F4F1EC] hover:bg-miamo-elevated/60 dark:hover:bg-[#1F2229]/60'
          )}
         >
          <s.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1">{s.label}</span>
          {activeSection === s.id && <ChevronRight className="w-3.5 h-3.5 hidden lg:block" />}
         </button>
        ))}
       </nav>

       {/* Right pane */}
       <Card className="p-6 md:p-7 bg-miamo-card dark:bg-[#181A1F] border border-border dark:border-[#2A2D34]">
        <div className="mb-5">
         <h2 className="text-lg font-semibold text-text-primary dark:text-[#F4F1EC]">{activeMeta.label}</h2>
         <p className="text-xs text-text-muted dark:text-[#7A746D] mt-0.5">{activeMeta.blurb}</p>
        </div>

        {activeSection === 'account' && (
         <div className="space-y-1">
          <SettingRow icon={Mail} label="Email" description={user?.email || 'Not set'}>
           <Button variant="ghost" size="sm" onClick={() => setEmailModal(true)}>Change</Button>
          </SettingRow>
          <SettingRow icon={KeyRound} label="Password" description="Last changed 30 days ago">
           <Button variant="ghost" size="sm" onClick={() => setPasswordModal(true)}>Update</Button>
          </SettingRow>
          <SettingRow icon={User} label="Miamo ID" description={`@${user?.username || 'user'} — system-generated, read-only`}>
           <Button variant="ghost" size="sm" onClick={copyMiamoId}>{copiedId ? <><CheckIcon className="w-3.5 h-3.5 text-rose-main" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}</Button>
          </SettingRow>
          <SettingRow icon={Smartphone} label="Phone" description="Not set">
           <Button variant="ghost" size="sm" onClick={() => setPhoneModal(true)}>Add</Button>
          </SettingRow>
          <SettingRow icon={Wifi} label="Active sessions" description="1 active session">
           <Button variant="ghost" size="sm" onClick={() => setSessionsModal(true)}>Manage</Button>
          </SettingRow>
          {/* 2FA + third-party account linking are not shipped in v1 launch.
              Rows removed so the UI only advertises what actually works.
              Bring back when the endpoints ship + auth service supports them. */}
         </div>
        )}

        {activeSection === 'privacy' && (
         <div className="space-y-1">
          <SettingRow icon={Eye} label="Profile visibility" description="Who can see your profile">
           <Segmented<string>
            value={server.profileVisibility}
            options={[{ value: 'public', label: 'Public' }, { value: 'matches', label: 'Matches' }, { value: 'private', label: 'Private' }]}
            onChange={(v) => updatePref('profileVisibility', v)}
           />
          </SettingRow>
          <SettingRow label="Searchable by name"><Toggle enabled={server.searchByName} onToggle={() => toggleServer('searchByName')} /></SettingRow>
          <SettingRow label="Searchable by Miamo ID"><Toggle enabled={server.searchByMiamoId} onToggle={() => toggleServer('searchByMiamoId')} /></SettingRow>
          <SettingRow label="Searchable by city"><Toggle enabled={server.searchByCity} onToggle={() => toggleServer('searchByCity')} /></SettingRow>
          <SettingRow label="Show online status"><Toggle enabled={server.onlineStatus} onToggle={() => toggleServer('onlineStatus')} /></SettingRow>
          <SettingRow label="Show last active"><Toggle enabled={server.lastActive} onToggle={() => toggleServer('lastActive')} /></SettingRow>
          <SettingRow label="Read receipts"><Toggle enabled={server.readReceipts} onToggle={() => toggleServer('readReceipts')} /></SettingRow>
          <SettingRow label="Typing indicator"><Toggle enabled={server.typingIndicator} onToggle={() => toggleServer('typingIndicator')} /></SettingRow>
          <SettingRow label="Hide from people I know" description="Block your contacts from finding you"><Toggle enabled={local.hideFromContacts} onToggle={() => toggleLocal('hideFromContacts')} /></SettingRow>
          <SettingRow icon={EyeOff} label="Incognito mode" description="Browse without leaving a trace (Premium)">
           <Toggle enabled={local.incognitoMode} onToggle={() => toggleLocal('incognitoMode')} />
          </SettingRow>
          <SettingRow label="Serious Mode"><Toggle enabled={server.seriousMode} onToggle={() => toggleServer('seriousMode')} /></SettingRow>
          <SettingRow label="Receive broadcasts"><Toggle enabled={local.broadcastReceive} onToggle={() => toggleLocal('broadcastReceive')} /></SettingRow>
          <SettingRow label="AI personalization" description="Tune ranking based on your behaviour"><Toggle enabled={server.aiPersonalization} onToggle={() => toggleServer('aiPersonalization')} /></SettingRow>
         </div>
        )}

        {activeSection === 'personalization' && (
         <div className="space-y-1">
          <SettingRow
           icon={Sparkles}
           label="Mood-aware suggestions"
           description="Let Miamo infer your mood from app activity to recommend better matches and softer Move suggestions when you're tired."
          >
           <Toggle enabled={server.moodInferenceEnabled} onToggle={() => toggleServer('moodInferenceEnabled')} label="Mood-aware suggestions" />
          </SettingRow>
          <SettingRow
           icon={Sliders}
           label="Behavioural ranking"
           description="Use your dwell time, swipe patterns, and reply behaviour to improve your matches."
          >
           <Toggle enabled={server.behavioralRankingEnabled} onToggle={() => toggleServer('behavioralRankingEnabled')} label="Behavioural ranking" />
          </SettingRow>
          <SettingRow
           icon={Shield}
           label="Cross-user inference"
           description="Allow your signals to influence other users' queues (anonymously, via hashed IDs)."
          >
           <Toggle enabled={server.crossUserInferenceEnabled} onToggle={() => toggleServer('crossUserInferenceEnabled')} label="Cross-user inference" />
          </SettingRow>
          <SettingRow
           icon={Eye}
           label="Algorithm transparency"
           description="Show 'why am I seeing this' explainers on Discover cards."
          >
           <Toggle enabled={server.algorithmicTransparency} onToggle={() => toggleServer('algorithmicTransparency')} label="Algorithm transparency" />
          </SettingRow>
          <div className="mt-4 pt-4 border-t border-border/30 dark:border-[#2A2D34]/60">
           <p className="text-xs text-text-muted dark:text-[#7A746D] leading-relaxed">
            <span className="font-semibold text-text-secondary dark:text-[#B8B3AC]">Your data:</span>{' '}
            we use HMAC hashes (never your raw user ID) when other users' algorithms read your signals.
            You can revoke any of these settings at any time.
           </p>
          </div>
         </div>
        )}

        {activeSection === 'discovery' && (
         <div className="space-y-1">
          <SettingRow icon={CheckIcon} label="Verified profiles only" description="Hide unverified people from your feed"><Toggle enabled={local.verifiedOnly} onToggle={() => toggleLocal('verifiedOnly')} /></SettingRow>
          <SettingRow label="Hide profiles I've passed"><Toggle enabled={local.hidePassed} onToggle={() => toggleLocal('hidePassed')} /></SettingRow>
          <SettingRow label="Hide profiles from my contacts"><Toggle enabled={local.hideMyContacts} onToggle={() => toggleLocal('hideMyContacts')} /></SettingRow>
          <SettingRow icon={SearchIcon} label="Default tab on launch">
           <Segmented<LocalPrefs['defaultTab']>
            value={local.defaultTab}
            options={[{ value: 'discover', label: 'Discover' }, { value: 'matches', label: 'Matches' }, { value: 'messages', label: 'Messages' }, { value: 'beats', label: 'Beats' }]}
            onChange={(v) => setLocalPref('defaultTab', v)}
           />
          </SettingRow>
         </div>
        )}

        {activeSection === 'communication' && (
         <div className="space-y-1">
          <SettingRow icon={MessageSquare} label="Send with Enter" description="Cmd/Ctrl+Enter for newline when off"><Toggle enabled={local.sendOnEnter} onToggle={() => toggleLocal('sendOnEnter')} /></SettingRow>
          <SettingRow icon={Languages} label="Auto-translate messages" description="Translate to your language inline"><Toggle enabled={local.autoTranslate} onToggle={() => toggleLocal('autoTranslate')} /></SettingRow>
          <SettingRow label="Spell check"><Toggle enabled={local.spellCheck} onToggle={() => toggleLocal('spellCheck')} /></SettingRow>
          <SettingRow label="Auto-play voice messages"><Toggle enabled={local.voiceMessageAutoplay} onToggle={() => toggleLocal('voiceMessageAutoplay')} /></SettingRow>
          <SettingRow label="Chat bubble style">
           <Segmented<LocalPrefs['chatBubbleStyle']>
            value={local.chatBubbleStyle}
            options={[{ value: 'modern', label: 'Modern' }, { value: 'classic', label: 'Classic' }, { value: 'minimal', label: 'Minimal' }]}
            onChange={(v) => setLocalPref('chatBubbleStyle', v)}
           />
          </SettingRow>
         </div>
        )}

        {activeSection === 'beats' && (
         <div className="space-y-1">
          <SettingRow icon={Zap} label="Auto-save my own snaps" description="Keep a copy of beats you send"><Toggle enabled={local.autoSaveMyBeats} onToggle={() => toggleLocal('autoSaveMyBeats')} /></SettingRow>
          <SettingRow label="Screenshot warnings" description="Tell the other side when one of you screenshots"><Toggle enabled={local.screenshotWarning} onToggle={() => toggleLocal('screenshotWarning')} /></SettingRow>
          <SettingRow label="Confirm before replay" description="Replay auto-saves; confirm first"><Toggle enabled={local.replayConfirm} onToggle={() => toggleLocal('replayConfirm')} /></SettingRow>
          <SettingRow label="Beat reminders" description="Nudge me when a streak is at risk"><Toggle enabled={server.beatReminders} onToggle={() => toggleServer('beatReminders')} /></SettingRow>
         </div>
        )}

        {activeSection === 'notifications' && (
         <div className="space-y-1">
          <SettingRow icon={Smartphone} label="Push notifications" description="On this device"><Toggle enabled={local.pushNotifs} onToggle={() => toggleLocal('pushNotifs')} /></SettingRow>
          <SettingRow icon={Mail} label="Email notifications"><Toggle enabled={local.emailNotifs} onToggle={() => toggleLocal('emailNotifs')} /></SettingRow>
          <SettingRow icon={Volume2} label="In-app sounds"><Toggle enabled={local.inAppSounds} onToggle={() => toggleLocal('inAppSounds')} /></SettingRow>
          <SettingRow icon={Vibrate} label="Vibration"><Toggle enabled={local.vibrate} onToggle={() => toggleLocal('vibrate')} /></SettingRow>
          <SettingRow icon={Heart} label="New matches"><Toggle enabled={server.matchNotifications} onToggle={() => toggleServer('matchNotifications')} /></SettingRow>
          <SettingRow icon={MessageSquare} label="New messages"><Toggle enabled={server.messageNotifications} onToggle={() => toggleServer('messageNotifications')} /></SettingRow>
          <SettingRow icon={Zap} label="Beat reminders"><Toggle enabled={server.beatReminders} onToggle={() => toggleServer('beatReminders')} /></SettingRow>
          <SettingRow label="Story notifications"><Toggle enabled={server.storyNotifications} onToggle={() => toggleServer('storyNotifications')} /></SettingRow>
          <SettingRow label="Quiet hours" description="No alerts 11PM – 7AM"><Toggle enabled={local.quietHours} onToggle={() => toggleLocal('quietHours')} /></SettingRow>
         </div>
        )}

        {activeSection === 'appearance' && (
         <div className="space-y-1">
          <SettingRow icon={Palette} label="Theme" description="Light, Dark, or follow your system">
           <div className="flex gap-1.5">
            {[{ key: 'light', icon: Sun }, { key: 'dark', icon: Moon }, { key: 'system', icon: Monitor }].map((t) => (
             <button
              key={t.key}
              onClick={() => setTheme(t.key as any)}
              className={cn(
               'p-2 rounded-lg border transition-all',
               theme === t.key
                ? 'bg-rose-main/10 border-rose-main/30 text-rose-main'
                : 'border-border dark:border-[#2A2D34] text-text-muted dark:text-[#B8B3AC] hover:border-rose-main/30'
              )}
              aria-label={t.key}
             >
              <t.icon className="w-4 h-4" />
             </button>
            ))}
           </div>
          </SettingRow>
          <SettingRow label="Font size">
           <Segmented<LocalPrefs['fontSize']>
            value={local.fontSize}
            options={[{ value: 'small', label: 'A-' }, { value: 'medium', label: 'A' }, { value: 'large', label: 'A+' }]}
            onChange={(v) => setLocalPref('fontSize', v)}
           />
          </SettingRow>
          <SettingRow label="Sidebar density">
           <Segmented<LocalPrefs['sidebarDensity']>
            value={local.sidebarDensity}
            options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]}
            onChange={(v) => setLocalPref('sidebarDensity', v)}
           />
          </SettingRow>
          <SettingRow label="Reduce motion" description="Disable spring animations"><Toggle enabled={local.reduceMotion} onToggle={() => toggleLocal('reduceMotion')} /></SettingRow>
          <SettingRow label="Color blindness mode">
           <Segmented<LocalPrefs['colorBlindMode']>
            value={local.colorBlindMode}
            options={[{ value: 'off', label: 'Off' }, { value: 'protanopia', label: 'Prot' }, { value: 'deuteranopia', label: 'Deut' }, { value: 'tritanopia', label: 'Trit' }]}
            onChange={(v) => setLocalPref('colorBlindMode', v)}
           />
          </SettingRow>
          {/* Accent color picker removed for v1 launch — the theme system
              supports dark/light + colour-blindness modes but user-selectable
              accent isn't wired end-to-end. Bring back when it ships. */}
         </div>
        )}

        {activeSection === 'preferences' && (
         <div className="space-y-1">
          {/* Phase G.13 — client-side app-language radio group.
              Independent from the legacy server language pref below.
              Persists to localStorage['miamo.locale'] and swaps UI copy
              live. See docs/architecture/i18n.md. */}
          <SettingRow icon={Languages} label="App language" description="Instant switch for supported locales">
           <div
            role="radiogroup"
            aria-label="App language"
            className="flex flex-wrap gap-1 p-0.5 bg-miamo-elevated/60 dark:bg-[#1F2229] border border-border/60 dark:border-[#2A2D34] rounded-lg"
           >
            {locales.map((l) => (
             <button
              key={l}
              type="button"
              role="radio"
              aria-checked={locale === l}
              onClick={() => setLocale(l as Locale)}
              className={cn(
               'px-2.5 py-1 text-xs rounded-md transition-colors',
               locale === l
                ? 'bg-rose-main text-white'
                : 'text-text-primary dark:text-[#F4F1EC] hover:bg-rose-soft/40 dark:hover:bg-rose-main/10'
              )}
             >
              {LOCALE_LABELS[l as Locale]}
             </button>
            ))}
           </div>
          </SettingRow>
          <SettingRow icon={Languages} label="Language" description={server.language}>
           <select value={server.language} onChange={(e) => updatePref('language', e.target.value)} className="bg-miamo-elevated dark:bg-[#1F2229] border border-border dark:border-[#2A2D34] rounded-lg px-3 py-1.5 text-xs text-text-primary dark:text-[#F4F1EC] focus:outline-none">
            {['English', 'Hindi', 'Spanish', 'French', 'German', 'Portuguese', 'Japanese', 'Korean', 'Chinese'].map((l) => <option key={l} value={l}>{l}</option>)}
           </select>
          </SettingRow>
          <SettingRow label="Time format">
           <Segmented<LocalPrefs['timeFormat']>
            value={local.timeFormat}
            options={[{ value: '12h', label: '12-hour' }, { value: '24h', label: '24-hour' }]}
            onChange={(v) => setLocalPref('timeFormat', v)}
           />
          </SettingRow>
          <SettingRow label="Date format">
           <Segmented<LocalPrefs['dateFormat']>
            value={local.dateFormat}
            options={[{ value: 'relative', label: '2h ago' }, { value: 'absolute', label: 'May 17' }, { value: 'short', label: '5/17' }]}
            onChange={(v) => setLocalPref('dateFormat', v)}
           />
          </SettingRow>
          <SettingRow label="Distance unit">
           <Segmented<LocalPrefs['distanceUnit']>
            value={local.distanceUnit}
            options={[{ value: 'mi', label: 'Miles' }, { value: 'km', label: 'Kilometres' }]}
            onChange={(v) => setLocalPref('distanceUnit', v)}
           />
          </SettingRow>
         </div>
        )}

        {activeSection === 'safety' && (
         <div className="space-y-1">
          <SettingRow icon={Lock} label="Disappearing messages" description="Auto-delete after 24h"><Toggle enabled={local.disappearingMessages} onToggle={() => toggleLocal('disappearingMessages')} /></SettingRow>
          <SettingRow icon={EyeOff} label="Block screenshots in chat" description="Native screenshot guard where supported"><Toggle enabled={local.blockChatScreenshots} onToggle={() => toggleLocal('blockChatScreenshots')} /></SettingRow>
          <SettingRow icon={CheckIcon} label="Photo-verified profiles only" description="Match only with verified people"><Toggle enabled={local.photoVerificationOnly} onToggle={() => toggleLocal('photoVerificationOnly')} /></SettingRow>
          <SettingRow icon={Shield} label="Block list" description={`${blockCount} blocked`}>
           <Button variant="ghost" size="sm" onClick={() => setShowBlockList((v) => !v)} aria-expanded={showBlockList}>
            {showBlockList ? 'Hide' : 'Manage'}
           </Button>
          </SettingRow>
          {showBlockList && (
           <BlockListPanel
            onCountChange={(n) => { setBlockCount(n); setBlockList([]); }}
            showToast={showToast}
           />
          )}
          <SettingRow label="Safety tips"><Button variant="ghost" size="sm" onClick={() => router.push('/safety')}>Read</Button></SettingRow>
         </div>
        )}

        {activeSection === 'subscription' && (
         <div className="space-y-4">
          <div className="rounded-2xl p-5 bg-gradient-to-br from-rose-main to-rose-light text-white shadow-rose">
           <div className="flex items-center gap-2 mb-2"><Crown className="w-5 h-5" /> <span className="text-xs uppercase tracking-wider opacity-90">Current plan</span></div>
           <h3 className="text-2xl font-semibold">Miamo — full access</h3>
           <p className="text-xs opacity-90 mt-1">Free for everyone during launch. No renewal, no charge.</p>
          </div>
          <div className="space-y-1">
           <SettingRow icon={Sparkles} label="See what you get" description="Every feature unlocked while we&rsquo;re in launch mode">
            <Button variant="ghost" size="sm" onClick={() => router.push('/premium')}>View</Button>
           </SettingRow>
          </div>
         </div>
        )}

        {activeSection === 'help' && (
         <div className="space-y-1">
          <SettingRow icon={HelpCircle} label="Help center" description="Browse guides and FAQs">
           <Button variant="ghost" size="sm" onClick={() => router.push('/safety')}>Open</Button>
          </SettingRow>
          {/* click-matrix.md §5 rank 1: Email us, Share feedback wired to mailto:. */}
          <SettingRow icon={Mail} label="Contact support" description="We reply within 24h">
           <a href="mailto:support@miamo.in?subject=Miamo%20support%20request"><Button variant="ghost" size="sm" aria-label="Email support at support@miamo.in">Email us</Button></a>
          </SettingRow>
          <SettingRow icon={MessageSquare} label="Send feedback" description="Tell us what could be better">
           <a href="mailto:feedback@miamo.in?subject=Miamo%20feedback"><Button variant="ghost" size="sm" aria-label="Send feedback by email">Share</Button></a>
          </SettingRow>
          {/* What's new + Rate Miamo removed for v1 launch — no changelog
              destination and no App Store / Play Store URL yet. Both come
              back once the stores approve v1 and the changelog is public. */}
          <div className="pt-4 border-t border-border/30 dark:border-[#2A2D34]/60 mt-4">
           <p className="text-xs text-text-muted">Miamo · v1.0.0</p>
           <div className="flex gap-3 mt-2 text-xs text-rose-main">
            <a href="/safety" className="hover:underline">Privacy</a>
            <a href="/safety" className="hover:underline">Terms</a>
            <a href="/safety" className="hover:underline">Cookies</a>
           </div>
          </div>
         </div>
        )}

        {activeSection === 'data' && (
         <div className="space-y-1">
          <SettingRow icon={Download} label="Download my data" description="Get a JSON export of everything we have">
           <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}>{downloading ? 'Downloading…' : 'Download'}</Button>
          </SettingRow>
          <SettingRow icon={Eye} label="Deactivate account" description="Temporarily hide your profile">
           <Button variant="ghost" size="sm" onClick={handleDeactivate}>Deactivate</Button>
          </SettingRow>
          <SettingRow icon={Trash2} label="Delete account" description="Permanently delete everything. This is forever.">
           <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} aria-label="Open account deletion dialog"><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
          </SettingRow>
         </div>
        )}
       </Card>
      </div>
     </>)}
    </div>
   </div>
  </ErrorBoundary>
 );
}
