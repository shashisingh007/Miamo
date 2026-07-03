// Miamo Mobile — Numerology.
// Web parity: services/web/src/app/(main)/dtm/numerology/page.tsx.
//
// Shows the user's own numerology profile plus, when a targetUserId is passed,
// numerology-based compatibility for that user.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function NumerologyScreen() {
  useTrackPageView('numerology');
  const route = useRoute<any>();
  const targetUserId: string | undefined = route.params?.targetUserId;

  const [self, setSelf] = useState<any>(null);
  const [compat, setCompat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        (api as any).getMatrimonialNumerology
          ? (api as any).getMatrimonialNumerology()
          : Promise.resolve(null),
        targetUserId && (api as any).getMatrimonialNumerologyCompat
          ? (api as any).getMatrimonialNumerologyCompat(targetUserId)
          : Promise.resolve(null),
      ]);
      setSelf((s as any)?.data ?? s ?? null);
      setCompat((c as any)?.data ?? c ?? null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="numerology-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load numerology"
        message={error}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <SafeAreaView style={styles.wrap} testID="numerology-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Numerology</Text>
        {self ? (
          <View style={styles.card}>
            <Text style={styles.section}>Your numbers</Text>
            <Row label="Life path" value={self.lifePath} />
            <Row label="Destiny" value={self.destiny} />
            <Row label="Soul urge" value={self.soulUrge} />
            <Row label="Personality" value={self.personality} />
            <Row label="Birthday" value={self.birthday} />
            {self.summary ? (
              <Text style={styles.body}>{self.summary}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.body}>
              We need your date of birth to compute numerology. Add it in your
              profile.
            </Text>
          </View>
        )}

        {targetUserId ? (
          <View style={styles.card}>
            <Text style={styles.section}>Compatibility</Text>
            {compat ? (
              <View>
                <Text style={styles.big}>
                  {compat.score ?? compat.overall ?? '—'}
                </Text>
                <Text style={styles.body}>
                  {compat.verdict ?? 'Numerology compatibility summary.'}
                </Text>
                {Array.isArray(compat.factors)
                  ? compat.factors.map((f: any, i: number) => (
                      <Row key={i} label={f.label} value={f.score} />
                    ))
                  : null}
              </View>
            ) : (
              <Text style={styles.body}>No compatibility data.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>
        {value == null || value === '' ? '—' : String(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  rowLabel: { fontSize: 13, color: '#666' },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#111' },
  body: { fontSize: 14, color: '#333', marginTop: 8, lineHeight: 20 },
  big: { fontSize: 34, fontWeight: '800', color: '#c92244', marginBottom: 8 },
});
