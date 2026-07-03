// Miamo Mobile — Premium upsell.
// Web parity: services/web/src/app/(main)/premium/page.tsx.
// Purchases are TODO (Stripe / IAP not wired yet on mobile). Screen just
// displays the value prop + subscription tiers.
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

const TIERS = [
  { id: 'monthly', label: 'Monthly', price: '₹499/mo', highlight: false },
  { id: 'yearly', label: 'Yearly', price: '₹3999/yr', highlight: true },
];

export default function PremiumScreen() {
  useTrackPageView('premium');

  return (
    <SafeAreaView style={styles.wrap} testID="premium-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Miamo Premium</Text>
        <Text style={styles.meta}>
          Unlimited moves, undo swipes, and priority in Discover.
        </Text>
        {TIERS.map(t => (
          <Pressable
            key={t.id}
            testID={`premium-tier-${t.id}`}
            onPress={() => toast.info('Purchase flow coming soon')}
            style={[styles.tier, t.highlight && styles.tierHighlight]}>
            <Text style={styles.tierLabel}>{t.label}</Text>
            <Text style={styles.tierPrice}>{t.price}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  inner: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  meta: { fontSize: 14, color: '#555' },
  tier: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 8,
  },
  tierHighlight: { borderColor: '#111', backgroundColor: '#f7f7f7' },
  tierLabel: { fontSize: 16, fontWeight: '700' },
  tierPrice: { fontSize: 22, fontWeight: '800', marginTop: 6 },
});
