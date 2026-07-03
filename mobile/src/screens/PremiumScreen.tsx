// Miamo Mobile — Premium (v1 launch: everything free for everyone).
// Web parity: services/web/src/app/(main)/premium/page.tsx.
// When paid tiers are introduced later, re-instate the tier grid + IAP flow
// from git history — the plan grid + Razorpay integration is documented there.
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackPageView } from '@hooks/useTrackActivity';

const ALL_FEATURES: string[] = [
  'Unlimited likes',
  'See who liked you',
  'Advanced filters (age, distance, intent)',
  'Priority in Discover',
  'Unlimited Beats',
  'Read receipts',
  'AI Match insights + Why-this-match',
  'Undo pass',
  'Miamo Move v2 (behaviour-based openers)',
  'Family Brief (DTM parent-shareable bio)',
  'Voice Fingerprint reveal',
  'Weekly Top 10',
];

export default function PremiumScreen() {
  useTrackPageView('premium');

  return (
    <SafeAreaView style={styles.wrap} testID="premium-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Everything&apos;s on us — for launch</Text>
        <Text style={styles.meta}>
          Every Miamo feature is unlocked and free during our launch window.
          No paywall, no upsells, no limits.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ You have full access</Text>
          <Text style={styles.cardSub}>Included on every account.</Text>
          {ALL_FEATURES.map((f) => (
            <View key={f} style={styles.row}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.rowText}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>
          We&apos;ll add paid plans later. When we do, we&apos;ll tell you clearly —
          and your existing access won&apos;t suddenly disappear.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' },
  meta: { fontSize: 14, color: '#555', marginBottom: 4 },
  card: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e6c9bd',
    backgroundColor: '#fff8f5',
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 12, color: '#888', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 3 },
  check: { color: '#c97856', fontWeight: '800', width: 14 },
  rowText: { fontSize: 14, color: '#333', flexShrink: 1 },
  footnote: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 },
});
