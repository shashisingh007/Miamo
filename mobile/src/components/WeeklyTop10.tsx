// Miamo Mobile — Weekly Top 10 leaderboard.
// Ported from services/web/src/components/deferred/WeeklyTop10.tsx.
// - Returns null when the server flag is OFF (404 → api client returns null).
// - Shows rank, display name, city.
// - Includes a countdown to the next weekly refresh.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

export default function WeeklyTop10() {
  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'off' }
    | { kind: 'error'; message: string }
    | { kind: 'ok'; data: any[]; secondsUntilRefresh: number | null }
  >({ kind: 'loading' });

  useEffect(() => {
    let alive = true;
    api
      .getWeeklyTop()
      .then((res: any) => {
        if (!alive) return;
        if (!res) return setState({ kind: 'off' });
        setState({
          kind: 'ok',
          data: res.data || [],
          secondsUntilRefresh: res.secondsUntilRefresh ?? null,
        });
      })
      .catch(err => {
        if (!alive) return;
        setState({ kind: 'error', message: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (state.kind === 'loading') return <ActivityIndicator testID="weekly-top-loading" />;
  if (state.kind === 'off') return null;
  if (state.kind === 'error')
    return <Text style={styles.error}>{state.message}</Text>;

  return (
    <View testID="weekly-top-10">
      <View style={styles.header}>
        <Text style={styles.title}>This week's Top 10</Text>
        {state.secondsUntilRefresh ? (
          <Text style={styles.countdown}>{formatCountdown(state.secondsUntilRefresh)}</Text>
        ) : null}
      </View>
      <FlatList
        data={state.data}
        keyExtractor={(row: any) => `${row.rank}-${row.targetHash}`}
        renderItem={({ item }: any) => (
          <View style={styles.row} testID={`weekly-row-${item.rank}`}>
            <Text style={styles.rank}>#{item.rank}</Text>
            <Text style={styles.name}>{item.user?.displayName ?? 'Someone'}</Text>
            <Text style={styles.city}>{item.user?.city ?? ''}</Text>
          </View>
        )}
      />
    </View>
  );
}

function formatCountdown(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return `refreshes in ${d}d ${h}h`;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  countdown: { fontSize: 12, color: '#666' },
  row: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  rank: { width: 40, fontWeight: '700', color: '#e0a800' },
  name: { flex: 1, color: '#111' },
  city: { color: '#666', fontSize: 12 },
  error: { color: '#c92222', padding: 12 },
});
