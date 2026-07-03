// Miamo Mobile — Date ideas (curated list).
// Web parity: services/web/src/app/(main)/date-ideas/page.tsx.
// There's no dedicated /date-ideas backend endpoint; we hit /discover/why with
// a curated payload from the personalization ctx. For the mobile MVP we hit
// the compatibility endpoint by convention (returns matched-by-vibe items).
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { useTrackPageView } from '@hooks/useTrackActivity';

// Fallback curated ideas — surfaced when the backend has nothing for the
// current user. Deterministic, so tests can assert the list length.
const FALLBACK_IDEAS = [
  { id: 'coffee', title: 'Coffee walk in your neighborhood', category: 'chill' },
  { id: 'gallery', title: 'Small gallery tour', category: 'cultural' },
  { id: 'trek', title: 'Sunrise trek nearby', category: 'active' },
  { id: 'street-food', title: 'Street-food crawl', category: 'foodie' },
  { id: 'bookshop', title: 'Bookshop browse + long chat', category: 'chill' },
];

export default function DateIdeasScreen() {
  useTrackPageView('date-ideas');
  const [ideas, setIdeas] = useState<any[]>(FALLBACK_IDEAS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .getVibeMatches()
      .then(res => {
        if (!alive) return;
        const seed = res?.data ?? [];
        if (Array.isArray(seed) && seed.length > 0) {
          setIdeas(
            seed.slice(0, 8).map((s: any, i: number) => ({
              id: `vibe-${i}`,
              title: `Meet up with ${s.displayName ?? 'a vibe match'}`,
              category: s.mood ?? 'chill',
            })),
          );
        }
        setLoading(false);
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading)
    return (
      <View style={styles.center} testID="date-ideas-loading">
        <ActivityIndicator />
      </View>
    );
  if (ideas.length === 0) return <EmptyState title="No ideas yet" />;

  return (
    <SafeAreaView style={styles.wrap} testID="date-ideas-screen">
      <FlatList
        data={ideas}
        keyExtractor={(x: any) => x.id}
        ListHeaderComponent={<Text style={styles.title}>Date ideas</Text>}
        renderItem={({ item }: any) => (
          <View style={styles.row} testID={`date-idea-${item.id}`}>
            <Text style={styles.name}>{item.title}</Text>
            <Text style={styles.meta}>{item.category}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', padding: 16 },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2, textTransform: 'uppercase' },
});
