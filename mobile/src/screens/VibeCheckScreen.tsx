// Miamo Mobile — Vibe Check (mood, energy, topics, intent).
// Web parity: services/web/src/app/(main)/vibe-check/page.tsx.
//
// One-tap-per-day input for the vibe engine. Also surfaces:
//   • latest vibe (api.getLatestVibe)
//   • rolling history (api.getVibeHistory)
//   • matches keyed by vibe (api.getVibeMatches)
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

const MOODS = ['chill', 'flirty', 'deep', 'playful', 'quiet'] as const;
const INTENTS = ['serious', 'casual', 'dtm', 'exploring'] as const;
const TOPICS = [
  'music',
  'travel',
  'food',
  'sports',
  'movies',
  'books',
  'startups',
  'fashion',
  'gaming',
  'art',
  'tech',
  'wellness',
];

const ENERGY_STEPS = 10; // slider 0..100 in 10-step chips

export default function VibeCheckScreen() {
  useTrackPageView('vibe-check');
  const [mood, setMood] = useState<(typeof MOODS)[number]>('chill');
  const [energy, setEnergy] = useState(50);
  const [topics, setTopics] = useState<string[]>([]);
  const [intent, setIntent] = useState<(typeof INTENTS)[number]>('exploring');
  const [saving, setSaving] = useState(false);

  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Load ───────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, h, m] = await Promise.all([
        api.getLatestVibe().catch(() => null),
        (api as any).getVibeHistory
          ? (api as any).getVibeHistory().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        api.getVibeMatches().catch(() => ({ data: [] })),
      ]);
      const latestData = (l as any)?.data ?? l ?? null;
      setLatest(latestData);
      setHistory((h as any)?.data ?? []);
      setMatches((m as any)?.data ?? []);
      // Seed the form from the latest vibe.
      if (latestData) {
        setMood(latestData.mood ?? mood);
        setEnergy(latestData.energy ?? energy);
        setIntent(latestData.intent ?? intent);
        setTopics(latestData.topics ?? topics);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ─── Save ───────────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.saveVibeCheck({ mood, energy, topics, intent });
      toast.success('Vibe saved');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [mood, energy, topics, intent, load]);

  const toggleTopic = useCallback((t: string) => {
    setTopics(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t],
    );
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="vibe-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load vibe"
        message={error}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <SafeAreaView style={styles.wrap} testID="vibe-check-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>What's your vibe today?</Text>

        <Text style={styles.section}>Mood</Text>
        <View style={styles.pillRow}>
          {MOODS.map(m => (
            <Pressable
              key={m}
              testID={`vibe-mood-${m}`}
              onPress={() => setMood(m)}
              style={[styles.pill, mood === m && styles.pillActive]}>
              <Text style={mood === m ? styles.pillActiveText : styles.pillText}>
                {m}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Energy: {energy}</Text>
        <View style={styles.pillRow}>
          {Array.from({ length: ENERGY_STEPS + 1 }, (_, i) => i * 10).map(n => (
            <Pressable
              key={n}
              testID={`vibe-energy-${n}`}
              onPress={() => setEnergy(n)}
              style={[styles.pillSmall, energy === n && styles.pillActive]}>
              <Text
                style={energy === n ? styles.pillActiveText : styles.pillText}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Topics</Text>
        <View style={styles.pillRow}>
          {TOPICS.map(t => (
            <Pressable
              key={t}
              testID={`vibe-topic-${t}`}
              onPress={() => toggleTopic(t)}
              style={[styles.pill, topics.includes(t) && styles.pillActive]}>
              <Text
                style={
                  topics.includes(t) ? styles.pillActiveText : styles.pillText
                }>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Intent</Text>
        <View style={styles.pillRow}>
          {INTENTS.map(i => (
            <Pressable
              key={i}
              testID={`vibe-intent-${i}`}
              onPress={() => setIntent(i)}
              style={[styles.pill, intent === i && styles.pillActive]}>
              <Text
                style={intent === i ? styles.pillActiveText : styles.pillText}>
                {i}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          testID="vibe-save"
          onPress={save}
          disabled={saving}
          style={[styles.primary, saving && styles.disabled]}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Save vibe</Text>
          )}
        </Pressable>

        {latest ? (
          <View style={styles.card}>
            <Text style={styles.section}>Your last vibe</Text>
            <Text style={styles.meta}>
              {latest.mood} · energy {latest.energy} · {latest.intent}
              {latest.createdAt
                ? ` · ${new Date(latest.createdAt).toLocaleDateString()}`
                : ''}
            </Text>
          </View>
        ) : null}

        <Text style={styles.section}>Recent history</Text>
        {history.length === 0 ? (
          <Text style={styles.meta}>No history yet.</Text>
        ) : (
          <FlatList
            data={history.slice(0, 10)}
            keyExtractor={(v: any) => v.id ?? v.createdAt}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.historyRow}>
                <Text style={styles.historyDate}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.historyMeta}>
                  {item.mood} · {item.energy} · {item.intent}
                </Text>
              </View>
            )}
          />
        )}

        <Text style={styles.section}>Matches by vibe</Text>
        {matches.length === 0 ? (
          <Text style={styles.meta}>Nothing matched yet.</Text>
        ) : (
          matches.map((m: any) => (
            <View
              key={m.id ?? m.userId}
              style={styles.matchRow}
              testID={`vibe-match-${m.id ?? m.userId}`}>
              <View style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>
                  {m.displayName ?? 'Someone'}
                </Text>
                <Text style={styles.rowMeta}>
                  {m.matchScore ? `Match ${m.matchScore}%` : m.summary ?? ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 12 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillSmall: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#c92244', borderColor: '#c92244' },
  pillText: { color: '#111', fontSize: 13 },
  pillActiveText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  primary: {
    marginTop: 24,
    backgroundColor: '#c92244',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  card: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
  },
  meta: { color: '#666', fontSize: 13, marginTop: 4 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  historyDate: { color: '#333', fontWeight: '600' },
  historyMeta: { color: '#666' },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  rowName: { fontWeight: '700', color: '#111' },
  rowMeta: { fontSize: 12, color: '#666', marginTop: 2 },
});
