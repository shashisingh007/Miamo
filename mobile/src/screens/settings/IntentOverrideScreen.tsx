// Miamo Mobile — Settings › Intent override.
// Shows the server's inferred dating intent + confidence + reasons, plus a
// user override. Empty override falls back to server inference.
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
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { toast } from '@components/Toast';

const OPTIONS = [
  { value: 'serious', label: 'Serious', description: 'Long-term relationship' },
  { value: 'dtm', label: 'DTM', description: 'Marriage-track' },
  { value: 'casual', label: 'Casual', description: 'Dating, no rush' },
  { value: 'exploring', label: 'Exploring', description: 'Still figuring it out' },
];

interface IntentStatus {
  inferred?: string;
  confidence?: number;
  reasons?: string[];
  override?: string | null;
}

export default function IntentOverrideScreen() {
  const [status, setStatus] = useState<IntentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getIntentStatus();
      setStatus(((res as any)?.data ?? {}) as IntentStatus);
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

  const setOverride = useCallback(async (v: string | null) => {
    setSaving(true);
    try {
      await api.setIntentOverride(v);
      setStatus(cur => ({ ...(cur || {}), override: v }));
      toast.success(v ? 'Override applied' : 'Using server inference');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;

  const active = status?.override ?? status?.inferred ?? null;

  return (
    <SafeAreaView style={styles.wrap} testID="settings-intent">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Intent override</Text>
        <Text style={styles.body}>
          We infer what you're looking for from your activity. If we've got it wrong, override it
          here — this shapes who we recommend.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Currently inferred</Text>
          <Text style={styles.cardVal}>{status?.inferred ?? '—'}</Text>
          {status?.confidence !== undefined ? (
            <Text style={styles.cardMeta}>
              Confidence {Math.round((status.confidence ?? 0) * 100)}%
            </Text>
          ) : null}
          {status?.reasons?.length ? (
            <View style={{ marginTop: 6 }}>
              {status.reasons.slice(0, 4).map((r, i) => (
                <Text key={i} style={styles.reason}>
                  · {r}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={styles.section}>Override</Text>
        {OPTIONS.map(o => (
          <Pressable
            key={o.value}
            testID={`intent-${o.value}`}
            onPress={() => setOverride(o.value)}
            disabled={saving}
            style={[styles.option, active === o.value && styles.optionActive]}>
            <View style={{ flex: 1 }}>
              <Text style={active === o.value ? styles.optionActiveTitle : styles.optionTitle}>
                {o.label}
              </Text>
              <Text style={active === o.value ? styles.optionActiveDesc : styles.optionDesc}>
                {o.description}
              </Text>
            </View>
            {active === o.value ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}

        {status?.override ? (
          <Pressable
            testID="intent-clear"
            onPress={() => setOverride(null)}
            disabled={saving}
            style={[styles.clearBtn, saving && { opacity: 0.5 }]}>
            <Text style={styles.clearText}>Clear override — use inference</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 20, gap: 14 },
  title: { fontSize: 24, fontWeight: '800' },
  body: { fontSize: 14, color: '#333', lineHeight: 20 },
  card: { padding: 14, borderRadius: 12, backgroundColor: '#f7f7f7' },
  cardLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardVal: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#555', marginTop: 4 },
  reason: { fontSize: 12, color: '#666', marginTop: 2 },
  section: { fontSize: 13, color: '#666', textTransform: 'uppercase', marginTop: 8, letterSpacing: 0.5 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    gap: 8,
  },
  optionActive: { backgroundColor: '#111', borderColor: '#111' },
  optionTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  optionActiveTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  optionDesc: { fontSize: 12, color: '#666' },
  optionActiveDesc: { fontSize: 12, color: '#eee' },
  check: { color: '#fff', fontSize: 18, fontWeight: '800' },
  clearBtn: { alignItems: 'center', paddingVertical: 10 },
  clearText: { color: '#c92222', fontWeight: '600' },
});
