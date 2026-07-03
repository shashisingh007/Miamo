// Miamo Mobile — Settings › Data export.
// GDPR-style export. Pressing Request generates a signed URL. Once ready,
// the Download button opens it via Linking (in a system browser).
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import { toast } from '@components/Toast';

interface ExportPayload {
  url?: string;
  token?: string;
  expiresAt?: string;
  status?: string;
}

export default function DataExportScreen() {
  const [busy, setBusy] = useState(false);
  const [payload, setPayload] = useState<ExportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.exportData();
      setPayload(((res as any)?.data ?? res) as ExportPayload);
      toast.success('Export ready');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const download = useCallback(() => {
    if (!payload?.url) return;
    Linking.openURL(payload.url).catch(err => toast.error(err.message));
  }, [payload]);

  return (
    <SafeAreaView style={styles.wrap} testID="settings-export">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Data export</Text>
        <Text style={styles.body}>
          Request a download of everything Miamo knows about you: profile data, matches, chats,
          Beats, likes, activity history and settings. Provided as a JSON archive.
        </Text>

        {!payload && (
          <Pressable
            testID="export-request"
            onPress={request}
            disabled={busy}
            style={[styles.btn, busy && styles.btnDisabled]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Request export</Text>
            )}
          </Pressable>
        )}

        {payload && (
          <View style={styles.readyCard}>
            <Text style={styles.readyTitle}>Your archive is ready</Text>
            {payload.expiresAt ? (
              <Text style={styles.readyMeta}>
                Expires {new Date(payload.expiresAt).toLocaleString()}
              </Text>
            ) : null}
            <Pressable testID="export-download" onPress={download} style={styles.btn}>
              <Text style={styles.btnText}>Download</Text>
            </Pressable>
            <Pressable testID="export-refresh" onPress={request} style={styles.linkBtn}>
              <Text style={styles.link}>Regenerate link</Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  body: { fontSize: 14, color: '#333', lineHeight: 20 },
  btn: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: '700' },
  readyCard: { gap: 10, padding: 14, borderRadius: 12, backgroundColor: '#f7f7f7' },
  readyTitle: { fontSize: 16, fontWeight: '700' },
  readyMeta: { fontSize: 12, color: '#666' },
  linkBtn: { alignItems: 'center' },
  link: { color: '#111', fontWeight: '600' },
  error: { color: '#c92222', textAlign: 'center' },
});
