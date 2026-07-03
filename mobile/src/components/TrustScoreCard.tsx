// Miamo Mobile — Trust score card.
// Ported from web. Shows the numeric trust score + component breakdown.
// Returns null when the server flag is OFF (404).
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

export default function TrustScoreCard() {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'off' }
    | { kind: 'error'; msg: string }
    | { kind: 'ok'; score: number; parts: Array<{ label: string; delta: number }> }
  >({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    api
      .getTrustScore()
      .then((res: any) => {
        if (!alive) return;
        if (!res?.data) return setState({ kind: 'off' });
        setState({
          kind: 'ok',
          score: res.data.score ?? 0,
          parts: res.data.parts ?? [],
        });
      })
      .catch((err: any) => {
        if (!alive) return;
        if (err.statusCode === 404) return setState({ kind: 'off' });
        setState({ kind: 'error', msg: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === 'loading') return <ActivityIndicator testID="trust-score-loading" />;
  if (state.kind === 'off') return null;
  if (state.kind === 'error') return <Text style={styles.error}>{state.msg}</Text>;

  return (
    <View testID="trust-score-card" style={styles.card}>
      <Text style={styles.label}>Trust score</Text>
      <Text style={styles.score}>{state.score}</Text>
      {state.parts.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.partLabel}>{p.label}</Text>
          <Text style={[styles.partDelta, p.delta < 0 && styles.partDeltaNeg]}>
            {p.delta > 0 ? '+' : ''}
            {p.delta}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12 },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6 },
  score: { fontSize: 40, fontWeight: '800', color: '#111', marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  partLabel: { color: '#333' },
  partDelta: { fontWeight: '700', color: '#1a8a34' },
  partDeltaNeg: { color: '#c92222' },
  error: { color: '#c92222', padding: 12 },
});
