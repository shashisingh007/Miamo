// Miamo Mobile — Voice fingerprint reveal card.
// Fetches `/users/me/voice-fingerprint` and renders the archetype + a
// share-to-native-Share affordance.
// Web parity: services/web/src/components/deferred/VoiceFingerprint.tsx.
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

interface Voice {
  archetype: string | null;
  sentMessageCount: number;
  voice: { confidence: number };
}

export default function VoiceFingerprint() {
  const [data, setData] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getMyVoiceFingerprint()
      .then((res: any) => {
        if (!alive) return;
        setData(res?.data ?? null);
        setLoading(false);
      })
      .catch(err => {
        if (!alive) return;
        // 404 means the flag is off — hide the card silently.
        if (err.statusCode === 404) {
          setData(null);
        } else {
          setError(err.message);
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return <ActivityIndicator testID="voice-fingerprint-loading" />;
  if (error) return <Text style={styles.error}>{error}</Text>;
  if (!data || !data.archetype) return null;

  async function share() {
    if (!data) return;
    try {
      await Share.share({
        message: `My Miamo voice archetype: ${data.archetype}. Confidence ${Math.round(
          data.voice.confidence * 100,
        )}%.`,
      });
    } catch {}
  }

  return (
    <View testID="voice-fingerprint" style={styles.card}>
      <Text style={styles.label}>Your voice archetype</Text>
      <Text style={styles.archetype}>{data.archetype}</Text>
      <Text style={styles.meta}>
        {data.sentMessageCount} messages · {Math.round(data.voice.confidence * 100)}% confidence
      </Text>
      <Pressable
        testID="voice-fingerprint-share"
        accessibilityRole="button"
        onPress={share}
        style={styles.btn}>
        <Text style={styles.btnText}>Share my voice</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderColor: '#eee', borderRadius: 12, marginVertical: 12 },
  label: { fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6 },
  archetype: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 4 },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  btn: { marginTop: 12, backgroundColor: '#111', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  error: { color: '#c92222', padding: 12 },
});
