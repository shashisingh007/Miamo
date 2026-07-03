// Miamo Mobile — Kundli upload + compatibility.
// Web parity: services/web/src/app/(main)/dtm/kundli/page.tsx.
//
// - Lets the user upload their kundli data (via api.uploadKundli).
// - If arrived with a targetUserId route param, also shows compatibility
//   from api.getMatrimonialCompatibility(userId).
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { api } from '@lib/api';
import MediaPicker from '@components/MediaPicker';
import { toast } from '@components/Toast';
import EmptyState from '@components/EmptyState';
import { useTrackPageView } from '@hooks/useTrackActivity';

const NAKSHATRAS = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

export default function KundliScreen() {
  useTrackPageView('kundli');
  const route = useRoute<any>();
  const targetUserId: string | undefined = route.params?.targetUserId;

  const [kundliUri, setKundliUri] = useState<string | null>(null);
  const [nakshatra, setNakshatra] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [compat, setCompat] = useState<any>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);

  const loadCompat = useCallback(async () => {
    if (!targetUserId) return;
    setCompatLoading(true);
    try {
      const res: any = await api.getMatrimonialCompatibility(targetUserId);
      setCompat(res?.data ?? res ?? null);
      setCompatError(null);
    } catch (err) {
      setCompatError((err as Error).message);
    } finally {
      setCompatLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    loadCompat();
  }, [loadCompat]);

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      await (api as any).uploadKundli?.({
        kundliUrl: kundliUri ?? undefined,
        kundliData: notes ? { notes } : undefined,
        nakshatra: nakshatra || undefined,
      });
      toast.success('Kundli saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [kundliUri, nakshatra, notes]);

  return (
    <SafeAreaView style={styles.wrap} testID="kundli-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Kundli</Text>
        <Text style={styles.help}>
          Add your birth chart. We keep it private and only use it for
          compatibility checks with people you connect with.
        </Text>

        <Text style={styles.section}>Kundli image (optional)</Text>
        <MediaPicker
          onPicked={setKundliUri}
          label={kundliUri ? 'Change kundli image' : 'Upload kundli image'}
        />
        {kundliUri ? (
          <Text style={styles.meta}>Selected: {kundliUri}</Text>
        ) : null}

        <Text style={styles.section}>Nakshatra</Text>
        <View style={styles.pillRow}>
          {NAKSHATRAS.map(n => (
            <Pressable
              key={n}
              testID={`kundli-nak-${n}`}
              onPress={() => setNakshatra(n)}
              style={[
                styles.pill,
                nakshatra === n && styles.pillActive,
              ]}>
              <Text
                style={
                  nakshatra === n ? styles.pillActiveText : styles.pillText
                }>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Notes (optional)</Text>
        <TextInput
          testID="kundli-notes"
          placeholder="Birth time, place, planetary notes…"
          placeholderTextColor="#888"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.textArea}
        />

        <Pressable
          testID="kundli-save"
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && styles.disabled]}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Save kundli</Text>
          )}
        </Pressable>

        {targetUserId ? (
          <View style={styles.compat}>
            <Text style={styles.section}>Compatibility</Text>
            {compatLoading ? (
              <ActivityIndicator testID="kundli-compat-loading" />
            ) : compatError ? (
              <EmptyState title="Couldn't load" message={compatError} />
            ) : compat ? (
              <View>
                <Text style={styles.compatOverall}>
                  Overall: {compat.overall ?? '—'}
                </Text>
                {Array.isArray(compat.factors)
                  ? compat.factors.map((f: any, i: number) => (
                      <View key={i} style={styles.compatRow}>
                        <Text style={styles.compatLabel}>{f.label}</Text>
                        <Text style={styles.compatScore}>{f.score}</Text>
                      </View>
                    ))
                  : null}
                {compat.gunaMilan ? (
                  <Text style={styles.meta}>
                    Guna Milan: {compat.gunaMilan}/36
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.meta}>No data yet.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f7f7f9' },
  inner: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, color: '#111' },
  help: { fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 20 },
  section: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pillActive: { backgroundColor: '#111', borderColor: '#111' },
  pillText: { color: '#111', fontSize: 12 },
  pillActiveText: { color: '#fff', fontSize: 12 },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#111',
    backgroundColor: '#fff',
  },
  primary: {
    marginTop: 20,
    backgroundColor: '#c92244',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  compat: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  compatOverall: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#111' },
  compatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  compatLabel: { color: '#333' },
  compatScore: { color: '#c92244', fontWeight: '700' },
});
