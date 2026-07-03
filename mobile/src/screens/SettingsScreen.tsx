// Miamo Mobile — Settings home.
// Mirrors services/web/src/app/(main)/settings/page.tsx as a mobile-native
// list-of-rows. Each row that owns real UI navigates into a sub-screen
// under mobile/src/screens/settings/*.
//
// Inline items (kept on this screen because they're pure switches or trivial
// pickers): Push notifications, Online status, Read receipts, Language,
// Theme, Support, ToS, Privacy policy, and Sign out.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '@lib/api';
import { useSettingsStore } from '@stores/settingsStore';
import { useAuth } from '@hooks/useAuth';
import { useTrackPageView } from '@hooks/useTrackActivity';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import type { RootStackParamList } from '@/navigation/AppNavigator';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'bn', label: 'Bengali' },
];
const THEMES = [
  { code: 'system', label: 'System' },
  { code: 'light', label: 'Light' },
  { code: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  useTrackPageView('settings');
  const { settings, loading, error, refresh, update } = useSettingsStore();
  const { logout } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openWeb = useCallback((url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Cannot open link'));
  }, []);

  async function submitPasswordChange() {
    if (!currentPassword || newPassword.length < 8) {
      Alert.alert('Password too short', 'New password must be at least 8 characters.');
      return;
    }
    setPwSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      toast.success('Password changed');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPwSaving(false);
    }
  }

  if (loading && !settings)
    return (
      <View style={styles.center} testID="settings-loading">
        <ActivityIndicator />
      </View>
    );
  if (error && !settings)
    return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={refresh} />;

  const currentLang = (settings as any)?.language ?? 'en';
  const currentTheme = (settings as any)?.theme ?? 'system';

  return (
    <SafeAreaView style={styles.wrap} testID="settings-screen">
      <ScrollView>
        <Text style={styles.title}>Settings</Text>

        {/* ─── Notifications ─────────────────────────── */}
        <Text style={styles.section}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Push notifications</Text>
          <Switch
            testID="settings-push"
            value={!!(settings as any)?.pushNotifications}
            onValueChange={v => update({ pushNotifications: v } as any)}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email notifications</Text>
          <Switch
            testID="settings-email"
            value={!!(settings as any)?.emailNotifications}
            onValueChange={v => update({ emailNotifications: v } as any)}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Show online status</Text>
          <Switch
            testID="settings-online"
            value={!!(settings as any)?.showOnlineStatus}
            onValueChange={v => update({ showOnlineStatus: v } as any)}
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Read receipts</Text>
          <Switch
            testID="settings-read-receipts"
            value={!!(settings as any)?.showReadReceipts}
            onValueChange={v => update({ showReadReceipts: v } as any)}
          />
        </View>

        {/* ─── Safety & Privacy ──────────────────────── */}
        <Text style={styles.section}>Safety & privacy</Text>
        <NavRow testID="settings-privacy" label="Privacy & visibility" onPress={() => navigation.navigate('SettingsPrivacy' as any)} />
        <NavRow
          testID="settings-blocks"
          label="Blocked users"
          onPress={() => navigation.navigate('SettingsBlocked' as any)}
        />
        <NavRow
          testID="settings-devices"
          label="Trusted devices"
          onPress={() => navigation.navigate('SettingsDevices' as any)}
        />
        <NavRow
          testID="settings-intent"
          label="Intent override"
          onPress={() => navigation.navigate('SettingsIntent' as any)}
        />
        <NavRow
          testID="settings-trust-score"
          label="Trust score"
          onPress={() => navigation.navigate('SettingsTrust' as any)}
        />

        {/* ─── Preferences ───────────────────────────── */}
        <Text style={styles.section}>Preferences</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Language</Text>
        </View>
        <View style={styles.chipRow}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              testID={`settings-lang-${l.code}`}
              onPress={() => update({ language: l.code } as any)}
              style={[styles.pill, currentLang === l.code && styles.pillActive]}>
              <Text style={currentLang === l.code ? styles.pillActiveText : styles.pillText}>
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Theme</Text>
        </View>
        <View style={styles.chipRow}>
          {THEMES.map(t => (
            <Pressable
              key={t.code}
              testID={`settings-theme-${t.code}`}
              onPress={() => update({ theme: t.code } as any)}
              style={[styles.pill, currentTheme === t.code && styles.pillActive]}>
              <Text style={currentTheme === t.code ? styles.pillActiveText : styles.pillText}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ─── Account ───────────────────────────────── */}
        <Text style={styles.section}>Account</Text>
        <Pressable
          testID="settings-change-password"
          onPress={() => setShowPasswordForm(v => !v)}
          style={styles.linkRow}>
          <Text style={styles.link}>{showPasswordForm ? 'Cancel password change' : 'Change password'}</Text>
        </Pressable>
        {showPasswordForm && (
          <View style={styles.inlineForm}>
            <TextInput
              testID="settings-current-password"
              placeholder="Current password"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
            />
            <TextInput
              testID="settings-new-password"
              placeholder="New password (min 8 chars)"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
            <Pressable
              testID="settings-password-submit"
              onPress={submitPasswordChange}
              disabled={pwSaving}
              style={[styles.btn, pwSaving && styles.btnDisabled]}>
              {pwSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Update password</Text>
              )}
            </Pressable>
          </View>
        )}
        <NavRow
          testID="settings-data-export"
          label="Data export"
          onPress={() => navigation.navigate('SettingsExport' as any)}
        />
        <NavRow
          testID="settings-open-verify"
          label="Get verified"
          onPress={() => navigation.navigate('Verify')}
        />
        <NavRow
          testID="settings-open-premium"
          label="Miamo Premium"
          onPress={() => navigation.navigate('Premium')}
        />

        {/* ─── Danger zone ───────────────────────────── */}
        <Text style={[styles.section, styles.dangerSection]}>Danger zone</Text>
        <NavRow
          testID="settings-deactivate"
          label="Deactivate account"
          onPress={() => navigation.navigate('SettingsDeactivate' as any)}
          danger
        />
        <NavRow
          testID="settings-delete"
          label="Delete account"
          onPress={() => navigation.navigate('SettingsDelete' as any)}
          danger
        />

        {/* ─── Help & legal ──────────────────────────── */}
        <Text style={styles.section}>Help & legal</Text>
        <Pressable
          testID="settings-support"
          onPress={() => openWeb('mailto:support@miamo.in')}
          style={styles.linkRow}>
          <Text style={styles.link}>Contact support</Text>
        </Pressable>
        <Pressable
          testID="settings-tos"
          onPress={() => openWeb('https://miamo.in/legal/terms')}
          style={styles.linkRow}>
          <Text style={styles.link}>Terms of service</Text>
        </Pressable>
        <Pressable
          testID="settings-privacy-policy"
          onPress={() => openWeb('https://miamo.in/legal/privacy')}
          style={styles.linkRow}>
          <Text style={styles.link}>Privacy policy</Text>
        </Pressable>

        <Pressable
          testID="settings-logout"
          onPress={() => setShowLogoutConfirm(true)}
          style={[styles.linkRow, styles.danger]}>
          <Text style={styles.dangerText}>Log out</Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Log out?"
        message="You can sign back in any time."
        confirmLabel="Log out"
        cancelLabel="Stay"
        danger
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
      />
    </SafeAreaView>
  );
}

function NavRow({
  label,
  onPress,
  testID,
  danger,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  danger?: boolean;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.linkRow} accessibilityRole="button">
      <Text style={danger ? styles.dangerText : styles.link}>{label}</Text>
      <Text style={styles.chev}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '800', padding: 16 },
  section: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerSection: { color: '#c92222' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  label: { fontSize: 15, color: '#111' },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  link: { color: '#111', fontWeight: '600' },
  chev: { color: '#999', fontSize: 18 },
  danger: { marginTop: 20 },
  dangerText: { color: '#c92222', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff', fontWeight: '600' },
  inlineForm: { padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  btn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '700' },
});
