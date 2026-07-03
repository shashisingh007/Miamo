// Miamo Mobile — Safety centre.
// Web parity: services/web/src/app/(main)/safety/page.tsx.
import React, { useEffect, useState } from 'react';
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
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function SafetyScreen() {
  useTrackPageView('safety');
  const [tips, setTips] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.getSafetyTips().catch(() => ({ data: [] })),
      api.getBlockList().catch(() => ({ data: [] })),
    ])
      .then(([t, b]) => {
        if (!alive) return;
        setTips(t?.data ?? []);
        setBlocks(b?.data ?? []);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function unblock(id: string) {
    try {
      await api.unblockUser(id);
      setBlocks(current => current.filter(b => (b.blockedId ?? b.id) !== id));
    } catch {
      // best-effort
    }
  }

  if (loading)
    return (
      <View style={styles.center} testID="safety-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} />;

  return (
    <SafeAreaView style={styles.wrap} testID="safety-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Safety</Text>
        <Text style={styles.section}>Tips</Text>
        {tips.map((t: any, i: number) => (
          <View key={i} style={styles.tip} testID={`safety-tip-${i}`}>
            <Text style={styles.tipTitle}>{t.title}</Text>
            <Text style={styles.tipBody}>{t.body}</Text>
          </View>
        ))}
        <Text style={styles.section}>Blocked</Text>
        {blocks.length === 0 ? (
          <Text style={styles.meta}>No blocks.</Text>
        ) : (
          blocks.map((b: any) => (
            <View key={b.blockedId ?? b.id} style={styles.block}>
              <Text style={styles.name}>{b.displayName ?? b.blockedId ?? b.id}</Text>
              <Pressable
                testID={`safety-unblock-${b.blockedId ?? b.id}`}
                onPress={() => unblock(b.blockedId ?? b.id)}
                style={styles.btn}>
                <Text style={styles.btnText}>Unblock</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  section: { fontSize: 14, fontWeight: '700', marginTop: 12, color: '#111' },
  tip: { padding: 12, backgroundColor: '#f7f7f7', borderRadius: 8, marginTop: 6 },
  tipTitle: { fontWeight: '600' },
  tipBody: { fontSize: 13, color: '#555', marginTop: 2 },
  block: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  meta: { fontSize: 13, color: '#666' },
  name: { fontSize: 14 },
  btn: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#111', borderRadius: 6 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
