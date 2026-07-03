// Miamo Mobile — Search (people).
// Web parity: services/web/src/app/(main)/search/page.tsx.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function SearchScreen() {
  useTrackPageView('search');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.search(q.trim(), 'all');
      setResults(res?.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  return (
    <SafeAreaView style={styles.wrap} testID="search-screen">
      <View style={styles.searchRow}>
        <TextInput
          testID="search-input"
          value={q}
          onChangeText={setQ}
          placeholder="Search people, prompts, cities"
          returnKeyType="search"
          onSubmitEditing={search}
          style={styles.input}
          autoCapitalize="none"
        />
        <Pressable testID="search-go" onPress={search} disabled={!q.trim()} style={styles.btn}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Go</Text>}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(x: any) => `${x.type}-${x.id}`}
        renderItem={({ item }: any) => (
          <View style={styles.row} testID={`search-result-${item.id}`}>
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.meta}>{item.type}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12 },
  btn: { paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#111', borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  error: { color: '#c92222', paddingHorizontal: 16, paddingVertical: 4 },
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
});
