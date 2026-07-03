// Miamo Mobile — Compatibility view (DTM detail).
// Web parity: services/web/src/app/(main)/compatibility/page.tsx.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function CompatibilityScreen() {
  useTrackPageView('compatibility');
  const route = useRoute<any>();
  const targetUserId: string | undefined = route.params?.targetUserId;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUserId) {
      setLoading(false);
      setError('Missing target user id');
      return;
    }
    let alive = true;
    api
      .getMatrimonialCompatibility(targetUserId)
      .then(res => {
        if (!alive) return;
        setData(res?.data ?? null);
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
  }, [targetUserId]);

  if (loading)
    return (
      <View style={styles.center} testID="compat-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load compatibility" message={error} />;
  if (!data) return <EmptyState title="No data" message="Compatibility unavailable." />;

  return (
    <SafeAreaView style={styles.wrap} testID="compatibility-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Compatibility</Text>
        <Text style={styles.score}>{Math.round((data.score ?? 0) * 100)}%</Text>
        {(data.dimensions ?? []).map((d: any, i: number) => (
          <View key={i} style={styles.dim}>
            <Text style={styles.dimName}>{d.name}</Text>
            <Text style={styles.dimScore}>{Math.round((d.score ?? 0) * 100)}%</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  score: { fontSize: 44, fontWeight: '800', color: '#111', marginVertical: 12 },
  dim: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  dimName: { fontSize: 14 },
  dimScore: { fontSize: 14, fontWeight: '700' },
});
