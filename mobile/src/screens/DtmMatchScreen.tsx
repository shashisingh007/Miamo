// Miamo Mobile — DTM matches screen (matrimonial matches).
// Web parity: services/web/src/app/(main)/dtm/matches/page.tsx.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function DtmMatchScreen() {
  useTrackPageView('dtm-match');
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getMatrimonialMatches()
      .then(res => {
        if (!alive) return;
        setMatches(res?.data ?? []);
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

  if (loading)
    return (
      <View style={styles.center} testID="dtm-match-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} />;
  if (matches.length === 0)
    return <EmptyState title="No DTM matches yet" message="Send interest to a DTM candidate to start." />;

  return (
    <SafeAreaView style={styles.wrap} testID="dtm-match-screen">
      <FlatList
        data={matches}
        keyExtractor={(m: any) => m.id}
        renderItem={({ item }: any) => (
          <Pressable style={styles.row} testID={`dtm-match-row-${item.id}`}>
            <View style={styles.avatar} />
            <View style={styles.body}>
              <Text style={styles.name}>{item.matchedUser?.displayName ?? 'Someone'}</Text>
              <Text style={styles.meta}>Mutual DTM interest</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd', marginRight: 12 },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
});
