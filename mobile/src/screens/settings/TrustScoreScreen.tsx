// Miamo Mobile — Settings › Trust score.
// Renders the shared TrustScoreCard component + an itemised breakdown of
// factors returned from api.getTrustScore. The card handles the headline
// number; the list underneath shows what to improve.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import TrustScoreCard from '@components/TrustScoreCard';

interface TrustScoreBreakdownItem {
  key: string;
  label: string;
  status?: 'good' | 'warn' | 'bad';
  detail?: string;
  points?: number;
}

interface TrustScoreData {
  score?: number;
  band?: 'low' | 'medium' | 'high';
  factors?: TrustScoreBreakdownItem[];
  tips?: string[];
}

export default function TrustScoreScreen() {
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTrustScore();
      setData(((res as any)?.data ?? res ?? {}) as TrustScoreData);
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

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;

  return (
    <SafeAreaView style={styles.wrap} testID="settings-trust">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Trust score</Text>
        <Text style={styles.body}>
          Your Trust score reflects how safe and complete your profile is. Higher scores earn more
          visibility and unlock certain features (like DTM family briefs).
        </Text>

        <TrustScoreCard />

        {data?.factors?.length ? (
          <View style={styles.list}>
            <Text style={styles.section}>Breakdown</Text>
            {data.factors.map(f => (
              <View key={f.key} style={styles.factor} testID={`trust-factor-${f.key}`}>
                <View style={[styles.dot, f.status === 'good' && styles.dotGood, f.status === 'warn' && styles.dotWarn, f.status === 'bad' && styles.dotBad]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  {f.detail ? <Text style={styles.factorDetail}>{f.detail}</Text> : null}
                </View>
                {typeof f.points === 'number' ? (
                  <Text style={styles.factorPoints}>{f.points > 0 ? `+${f.points}` : f.points}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {data?.tips?.length ? (
          <View style={styles.list}>
            <Text style={styles.section}>Ways to boost</Text>
            {data.tips.map((t, i) => (
              <Text key={i} style={styles.tip}>
                · {t}
              </Text>
            ))}
          </View>
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
  list: { gap: 8, marginTop: 4 },
  section: { fontSize: 13, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5 },
  factor: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ccc' },
  dotGood: { backgroundColor: '#1a8a34' },
  dotWarn: { backgroundColor: '#d19a17' },
  dotBad: { backgroundColor: '#c92222' },
  factorLabel: { fontSize: 14, fontWeight: '600', color: '#111' },
  factorDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  factorPoints: { fontSize: 13, color: '#111', fontWeight: '700' },
  tip: { fontSize: 13, color: '#333', lineHeight: 18 },
});
