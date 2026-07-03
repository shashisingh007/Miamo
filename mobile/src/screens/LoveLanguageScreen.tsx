// Miamo Mobile — Love language quiz + result view.
// Web parity: services/web/src/app/(main)/love-language/page.tsx.
// Uses the vibe-check endpoint under the hood since love-language is a
// vibe axis. Mobile MVP just surfaces the last saved value.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

const LANGUAGES = ['words', 'time', 'gifts', 'acts', 'touch'] as const;
type Language = (typeof LANGUAGES)[number];

export default function LoveLanguageScreen() {
  useTrackPageView('love-language');
  const [current, setCurrent] = useState<Language | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getLatestVibe()
      .then(res => {
        if (!alive) return;
        const topic = res?.data?.topics?.[0];
        if (topic && (LANGUAGES as readonly string[]).includes(topic)) setCurrent(topic as Language);
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

  async function pick(l: Language) {
    setCurrent(l);
    try {
      await api.saveVibeCheck({ mood: 'love-language', energy: 3, topics: [l], intent: 'serious' });
      toast.success('Saved');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading)
    return (
      <View style={styles.center} testID="love-language-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} />;

  return (
    <SafeAreaView style={styles.wrap} testID="love-language-screen">
      <Text style={styles.title}>Your love language</Text>
      <View style={styles.row}>
        {LANGUAGES.map(l => (
          <Pressable
            key={l}
            testID={`love-language-${l}`}
            onPress={() => pick(l)}
            style={[styles.pill, current === l && styles.pillActive]}>
            <Text style={current === l ? styles.pillActiveText : styles.pillText}>{l}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111' },
  pillActiveText: { color: '#fff' },
});
