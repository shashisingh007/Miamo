// Miamo Mobile — Settings › Deactivate.
// Soft-delete: hides your profile without deleting data. Reactivate resumes
// where you left off. Both actions gated by ConfirmDialog. Reachable from
// SettingsScreen row.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '@lib/api';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import { useAuth } from '@hooks/useAuth';

export default function DeactivateScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deactivated, setDeactivated] = useState(false);
  const [confirmDeact, setConfirmDeact] = useState(false);
  const [confirmReact, setConfirmReact] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      setDeactivated(!!(res as any)?.data?.deactivatedAt);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function doDeactivate() {
    setBusy(true);
    try {
      await api.deactivateAccount();
      toast.success('Account deactivated');
      setDeactivated(true);
      setConfirmDeact(false);
      // Sign the user out — reactivate happens via the (re-)login flow.
      await logout();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function doReactivate() {
    setBusy(true);
    try {
      await api.reactivateAccount();
      toast.success('Account reactivated');
      setDeactivated(false);
      setConfirmReact(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  return (
    <SafeAreaView style={styles.wrap} testID="settings-deactivate">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Deactivate account</Text>
        <Text style={styles.body}>
          Deactivating hides your profile from Discover, matches and search. Your data is preserved
          and you can reactivate any time by signing back in.
        </Text>
        <View style={styles.list}>
          <BulletPoint>Your matches will no longer see you.</BulletPoint>
          <BulletPoint>New likes and messages are paused.</BulletPoint>
          <BulletPoint>You keep all your data — nothing is deleted.</BulletPoint>
          <BulletPoint>Reactivate by signing back in.</BulletPoint>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {deactivated ? (
          <Pressable
            testID="deactivate-reactivate"
            disabled={busy}
            onPress={() => setConfirmReact(true)}
            style={[styles.btn, busy && styles.btnDisabled]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Reactivate account</Text>
            )}
          </Pressable>
        ) : (
          <Pressable
            testID="deactivate-submit"
            disabled={busy}
            onPress={() => setConfirmDeact(true)}
            style={[styles.btnDanger, busy && styles.btnDisabled]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Deactivate account</Text>
            )}
          </Pressable>
        )}
        <Pressable style={styles.linkBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Never mind</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        visible={confirmDeact}
        title="Deactivate account?"
        message="You will be signed out. Reactivate by signing back in."
        confirmLabel="Deactivate"
        danger
        onCancel={() => setConfirmDeact(false)}
        onConfirm={doDeactivate}
      />
      <ConfirmDialog
        visible={confirmReact}
        title="Reactivate account?"
        message="Your profile becomes visible in Discover again."
        confirmLabel="Reactivate"
        onCancel={() => setConfirmReact(false)}
        onConfirm={doReactivate}
      />
    </SafeAreaView>
  );
}

function BulletPoint({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 20, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  body: { fontSize: 14, color: '#333', lineHeight: 20 },
  list: { gap: 8 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: { color: '#111', fontWeight: '700' },
  bulletText: { flex: 1, color: '#333' },
  error: { color: '#c92222', textAlign: 'center' },
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDanger: {
    backgroundColor: '#c92222',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  link: { color: '#111', fontWeight: '600' },
});
