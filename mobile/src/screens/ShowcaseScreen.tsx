// Miamo Mobile — Showcase (profile spotlight).
// Web parity: services/web/src/app/(main)/showcase/page.tsx.
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

export default function ShowcaseScreen() {
  useTrackPageView('showcase');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getSpotlight()
      .then(res => {
        if (!alive) return;
        setItems(res?.data ?? []);
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
      <View style={styles.center} testID="showcase-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load spotlight" message={error} />;
  if (items.length === 0)
    return <EmptyState title="No spotlight items yet" message="Earn spotlight by posting creativity." />;

  return (
    <SafeAreaView style={styles.wrap} testID="showcase-screen">
      <FlatList
        data={items}
        keyExtractor={(x: any) => x.id}
        renderItem={({ item }: any) => (
          <View style={styles.card} testID={`showcase-item-${item.id}`}>
            <Text style={styles.name}>{item.title ?? item.displayName}</Text>
            <Text style={styles.meta}>Spotlight score {Math.round((item.score ?? 0) * 100)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
});
