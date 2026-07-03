// Miamo Mobile — AI match suggestions.
// Web parity: services/web/src/app/(main)/ai-match/page.tsx.
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
import WhyCard from '@components/WhyCard';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function AiMatchScreen() {
  useTrackPageView('ai-match');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getAiSuggestions()
      .then(res => {
        if (!alive) return;
        setSuggestions(res?.data ?? []);
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
      <View style={styles.center} testID="ai-match-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load AI match" message={error} />;
  if (suggestions.length === 0)
    return <EmptyState title="No AI suggestions yet" message="Complete your profile to unlock AI match." />;

  return (
    <SafeAreaView style={styles.wrap} testID="ai-match-screen">
      {selected ? (
        <WhyCard targetId={selected.id ?? selected.userId} />
      ) : null}
      <FlatList
        data={suggestions}
        keyExtractor={(x: any) => x.id ?? x.userId}
        renderItem={({ item }: any) => (
          <Pressable
            testID={`ai-match-row-${item.id ?? item.userId}`}
            onPress={() => setSelected(item)}
            style={styles.row}>
            <View style={styles.avatar} />
            <View style={styles.body}>
              <Text style={styles.name}>{item.displayName ?? 'Someone'}</Text>
              <Text style={styles.meta}>Score {Math.round((item.score ?? 0) * 100)}%</Text>
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
    alignItems: 'center',
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd', marginRight: 12 },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
});
