'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Bell, Palette, Eye, Lock, Globe, Moon, Sun, Monitor, Smartphone, Trash2, Download, Info, Heart, ChevronRight, LogOut, Check as CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui';
import { MiamoLoader } from '@/components/ui/miamo-logo';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuthStore, useThemeStore } from '@/stores';
import { useRouter } from 'next/navigation';

interface ToggleProps { enabled: boolean; onToggle: () => void; }
function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button onClick={onToggle} className={cn('w-10 h-6 rounded-full transition-colors relative', enabled ? 'bg-lavender-400' : 'bg-miamo-elevated border border-border')}>
      <motion.div animate={{ x: enabled ? 18 : 2 }} className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" />
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

const sections = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'privacy', label: 'Privacy & Search', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'safety', label: 'Safety', icon: Lock },
  { id: 'data', label: 'Data & Account', icon: Globe },
];

export default function SettingsPage() {
  const router = useRouter();
  const { clearAuth, user } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [activeSection, setActiveSection] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [blockList, setBlockList] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    searchByName: true,
    searchByMiamoId: true,
    searchByCity: false,
    onlineStatus: true,
    lastActive: true,
    readReceipts: true,
    typingIndicator: true,
    matchNotifications: true,
    messageNotifications: true,
    beatReminders: true,
    storyNotifications: false,
    darkMode: true,
    reduceMotion: false,
    disappearingMessages: false,
    seriousMode: false,
    broadcastReceive: true,
    aiPersonalization: true,
  });

  useEffect(() => {
    api.getSettings().then(res => {
      if (res.data) {
        const s = res.data;
        const p = s.privacy || {};
        setSettings(prev => ({
          ...prev,
          searchByName: p.searchByName ?? prev.searchByName,
          onlineStatus: p.onlineStatus ?? prev.onlineStatus,
          readReceipts: p.readReceipts ?? prev.readReceipts,
          matchNotifications: s.notifications?.matches ?? prev.matchNotifications,
          messageNotifications: s.notifications?.messages ?? prev.messageNotifications,
          beatReminders: s.notifications?.beats ?? prev.beatReminders,
          storyNotifications: s.notifications?.stories ?? prev.storyNotifications,
        }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (key: keyof typeof settings) => {
    const newVal = !settings[key];
    setSettings(s => ({ ...s, [key]: newVal }));
    setSaving(true);

    try {
      const privacyKeys = ['searchByName', 'searchByMiamoId', 'searchByCity', 'onlineStatus', 'lastActive', 'readReceipts', 'typingIndicator', 'disappearingMessages', 'seriousMode', 'broadcastReceive', 'aiPersonalization'];
      const notifKeys = ['matchNotifications', 'messageNotifications', 'beatReminders', 'storyNotifications'];

      if (privacyKeys.includes(key)) {
        await api.updatePrivacy({ [key]: newVal });
      } else if (notifKeys.includes(key)) {
        const notifMap: Record<string, string> = { matchNotifications: 'matches', messageNotifications: 'messages', beatReminders: 'beats', storyNotifications: 'stories' };
        await api.updateSettings({ notifications: { [notifMap[key]]: newVal } });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setSettings(s => ({ ...s, [key]: !newVal }));
    }
    setSaving(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.exportData();
      const blob = new Blob([JSON.stringify(res.data || res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'miamo-data-export.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {}
    setDownloading(false);
  };

  const handleDeactivate = async () => {
    try { await api.deactivateAccount(); clearAuth(); router.push('/login'); } catch (e) {}
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch (e) {}
    clearAuth();
    router.push('/login');
  };

  const handleUnblock = async (userId: string) => {
    try { await api.unblockUser(userId); setBlockList(prev => prev.filter(b => b.id !== userId)); } catch (e) {}
  };

  const loadBlockList = () => {
    api.getBlockList().then(res => setBlockList(res.data || [])).catch(() => {});
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {loading ? (
        <MiamoLoader text="Loading settings..." className="py-20" />
      ) : (
      <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Settings</h1>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckIcon className="w-3 h-3" /> Saved</span>}
          <Button variant="danger" size="sm" onClick={handleLogout}><LogOut className="w-3.5 h-3.5" /> Sign Out</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                activeSection === section.id ? 'bg-lavender-400/10 text-lavender-400' : 'text-text-muted hover:text-text-secondary hover:bg-miamo-elevated/50'
              )}
            >
              <section.icon className="w-4 h-4" /> {section.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <Card className="p-6">
          {activeSection === 'account' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Account</h2>
              <SettingRow label="Email" description={user?.email || 'Not set'}><Button variant="ghost" size="sm" onClick={() => { const v = prompt('New email:', user?.email || ''); if (v) api.updateProfile({ email: v }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }).catch(() => {}); }}>Change</Button></SettingRow>
              <SettingRow label="Password" description="Last changed 30 days ago"><Button variant="ghost" size="sm" onClick={() => { const v = prompt('New password:'); if (v && v.length >= 6) api.updatePassword?.({ currentPassword: prompt('Current password:') || '', newPassword: v }).catch(() => alert('Failed to update password')); else if (v) alert('Password must be 6+ characters'); }}>Update</Button></SettingRow>
              <SettingRow label="Miamo ID" description={`@${user?.username || 'user'}`}><Button variant="ghost" size="sm" onClick={() => { const v = prompt('New Miamo ID:', user?.username || ''); if (v) api.updateProfile({ username: v }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }).catch(() => alert('Username taken or invalid')); }}>Edit</Button></SettingRow>
              <SettingRow label="Phone" description="Not set"><Button variant="ghost" size="sm" onClick={() => { const v = prompt('Phone number:'); if (v) api.updateProfile({ phone: v }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }).catch(() => {}); }}>Add</Button></SettingRow>
              <SettingRow label="Two-factor authentication" description="Add extra security"><Button variant="ghost" size="sm" onClick={() => alert('Two-factor authentication setup coming in the next update.')}>Enable</Button></SettingRow>
              <SettingRow label="Active sessions" description="1 active session"><Button variant="ghost" size="sm" onClick={() => alert('Session management coming soon.')}>Manage</Button></SettingRow>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Privacy & Search</h2>
              <SettingRow label="Searchable by name" description="Others can find you by display name"><Toggle enabled={settings.searchByName} onToggle={() => toggle('searchByName')} /></SettingRow>
              <SettingRow label="Searchable by Miamo ID" description="Others can search your Miamo ID"><Toggle enabled={settings.searchByMiamoId} onToggle={() => toggle('searchByMiamoId')} /></SettingRow>
              <SettingRow label="Searchable by city" description="Show approximate location in search"><Toggle enabled={settings.searchByCity} onToggle={() => toggle('searchByCity')} /></SettingRow>
              <SettingRow label="Online status" description="Show when you're active"><Toggle enabled={settings.onlineStatus} onToggle={() => toggle('onlineStatus')} /></SettingRow>
              <SettingRow label="Last active" description="Show last active time"><Toggle enabled={settings.lastActive} onToggle={() => toggle('lastActive')} /></SettingRow>
              <SettingRow label="Read receipts" description="Show when you've read messages"><Toggle enabled={settings.readReceipts} onToggle={() => toggle('readReceipts')} /></SettingRow>
              <SettingRow label="Typing indicator" description="Show when you're typing"><Toggle enabled={settings.typingIndicator} onToggle={() => toggle('typingIndicator')} /></SettingRow>
              <SettingRow label="Serious Mode" description="Only match with serious-intent users"><Toggle enabled={settings.seriousMode} onToggle={() => toggle('seriousMode')} /></SettingRow>
              <SettingRow label="Receive broadcasts" description="Allow matches to send group content"><Toggle enabled={settings.broadcastReceive} onToggle={() => toggle('broadcastReceive')} /></SettingRow>
              <SettingRow label="AI personalization" description="Use AI for match recommendations"><Toggle enabled={settings.aiPersonalization} onToggle={() => toggle('aiPersonalization')} /></SettingRow>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Notifications</h2>
              <SettingRow label="Match notifications" description="When someone matches with you"><Toggle enabled={settings.matchNotifications} onToggle={() => toggle('matchNotifications')} /></SettingRow>
              <SettingRow label="Message notifications" description="New message alerts"><Toggle enabled={settings.messageNotifications} onToggle={() => toggle('messageNotifications')} /></SettingRow>
              <SettingRow label="Beat reminders" description="Daily streak reminder"><Toggle enabled={settings.beatReminders} onToggle={() => toggle('beatReminders')} /></SettingRow>
              <SettingRow label="Story notifications" description="When matches post stories"><Toggle enabled={settings.storyNotifications} onToggle={() => toggle('storyNotifications')} /></SettingRow>
              <SettingRow label="Quiet hours" description="No notifications 11PM–7AM"><Toggle enabled={settings.quietHours || false} onToggle={() => toggle('quietHours')} /></SettingRow>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Appearance</h2>
              <SettingRow label="Theme" description={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`}>
                <div className="flex gap-2">
                  {[{ icon: Moon, label: 'dark' as const }, { icon: Sun, label: 'light' as const }, { icon: Monitor, label: 'system' as const }].map((t) => (
                    <button key={t.label} onClick={() => setTheme(t.label)}
                      className={cn('p-2 rounded-lg border transition-all', theme === t.label ? 'bg-lavender-400/10 border-lavender-400/30 text-lavender-400' : 'border-border text-text-muted hover:border-border-light')}>
                      <t.icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </SettingRow>
              <SettingRow label="Reduce motion" description="Minimize animations"><Toggle enabled={settings.reduceMotion} onToggle={() => toggle('reduceMotion')} /></SettingRow>
              <SettingRow label="Chat wallpaper" description="Customize background"><Button variant="ghost" size="sm">Choose</Button></SettingRow>
              <SettingRow label="Accent color" description="Lavender"><div className="flex gap-1.5">{['bg-lavender-400', 'bg-violet-deep', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-400'].map((c) => <div key={c} className={cn('w-5 h-5 rounded-full', c, c === 'bg-lavender-400' && 'ring-2 ring-offset-2 ring-offset-miamo-card ring-lavender-400')} />)}</div></SettingRow>
            </div>
          )}

          {activeSection === 'safety' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Safety</h2>
              <SettingRow label="Disappearing messages" description="Messages auto-delete after 24h"><Toggle enabled={settings.disappearingMessages} onToggle={() => toggle('disappearingMessages')} /></SettingRow>
              <SettingRow label="Block list" description={`${blockList.length} blocked user${blockList.length !== 1 ? 's' : ''}`}>
                <Button variant="ghost" size="sm" onClick={() => { loadBlockList(); }}>Manage</Button>
              </SettingRow>
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
              <SettingRow label="Safety tips" description="Stay safe on Miamo"><Button variant="ghost" size="sm" onClick={() => router.push('/safety')}>Read</Button></SettingRow>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-1">
              <h2 className="text-base font-semibold mb-4">Data & Account</h2>
              <SettingRow label="Download my data" description="Get a copy of all your data">
                <Button variant="ghost" size="sm" onClick={handleDownload} disabled={downloading}>
                  <Download className="w-3.5 h-3.5" /> {downloading ? 'Downloading…' : 'Download'}
                </Button>
              </SettingRow>
              <SettingRow label="Deactivate account" description="Temporarily hide your profile">
                <Button variant="ghost" size="sm" onClick={handleDeactivate}>Deactivate</Button>
              </SettingRow>
              <SettingRow label="Delete account" description="Permanently delete everything">
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-400">Are you sure?</span>
                    <Button variant="danger" size="sm" onClick={async () => { try { await api.deactivateAccount(); clearAuth(); router.push('/login'); } catch (e) {} }}>Yes, Delete</Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="w-3.5 h-3.5" /> Delete</Button>
                )}
              </SettingRow>
              <div className="pt-4 border-t border-border/30 mt-4">
                <p className="text-xs text-text-muted">App version: 1.0.0 • Built with privacy first</p>
                <div className="flex gap-3 mt-2 text-xs text-lavender-400">
                  <a href="/safety" className="hover:underline">Privacy Policy</a>
                  <a href="/safety" className="hover:underline">Terms of Service</a>
                  <a href="/safety" className="hover:underline">Help & Support</a>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
