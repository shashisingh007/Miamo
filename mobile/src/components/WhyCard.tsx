// Miamo Mobile — WhyCard.
// Renders "Why am I seeing this?" — top-3 discover ingredients with 1-3 star
// weight. Falls back to null when the flag is off (server returns 404).
// Web parity: services/web/src/components/deferred/WhyCard.tsx.
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '@lib/api';

interface WhyStar {
  key: string;
  label: string;
  contribution: number;
  stars: 1 | 2 | 3;
}

export default function WhyCard({ targetId }: { targetId: string }) {
  const [data, setData] = useState<{ stars: WhyStar[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getDiscoverWhy(targetId)
      .then(res => {
        if (!alive) return;
        setData(res);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [targetId]);

  if (loading || !data) return null;
  return (
    <View testID="why-card" style={styles.card}>
      <Text style={styles.title}>Why am I seeing this?</Text>
      {data.stars.map(s => (
        <View key={s.key} style={styles.row}>
          <Text style={styles.stars}>{'★'.repeat(s.stars)}{'☆'.repeat(3 - s.stars)}</Text>
          <Text style={styles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginTop: 8 },
  title: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  stars: { fontSize: 14, color: '#e0a800', marginRight: 8, width: 44 },
  label: { flex: 1, fontSize: 13, color: '#333' },
});
