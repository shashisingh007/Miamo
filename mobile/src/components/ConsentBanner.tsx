// Miamo Mobile — ConsentBanner.
// Ported from services/web/src/components/ConsentBanner.tsx. Bottom-sheet
// style banner with Accept / Reject / Customize. Persists the choice to
// AsyncStorage under `miamo_consent` and hides itself once decided.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'miamo_consent';

export interface ConsentState {
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  ts?: number;
}

async function readConsent(): Promise<ConsentState> {
  try {
    const raw = await AsyncStorage.getItem(CONSENT_KEY);
    if (!raw) return { analytics: false, personalization: false, marketing: false };
    return JSON.parse(raw);
  } catch {
    return { analytics: false, personalization: false, marketing: false };
  }
}

async function writeConsent(next: Omit<ConsentState, 'ts'>) {
  try {
    await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({ ...next, ts: Date.now() }));
  } catch {}
}

interface Props {
  /** Skip rendering when tracking is globally disabled. */
  enabled?: boolean;
  /** Optional callback that fires after the user picks any option. */
  onDecide?: (c: ConsentState) => void;
  /** Region hint — 'IN' | 'EU' | other. Controls copy. */
  region?: 'IN' | 'EU' | string;
}

export function ConsentBanner({ enabled = true, onDecide, region }: Props) {
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalization, setPersonalization] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!enabled) return;
    (async () => {
      const c = await readConsent();
      if (!mounted) return;
      setAnalytics(c.analytics);
      setPersonalization(c.personalization);
      setMarketing(c.marketing);
      setVisible(!c.ts);
    })();
    return () => {
      mounted = false;
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  const persist = async (next: Omit<ConsentState, 'ts'>) => {
    await writeConsent(next);
    setVisible(false);
    onDecide?.({ ...next, ts: Date.now() });
  };

  const acceptAll = () =>
    persist({ analytics: true, personalization: true, marketing: false });
  const rejectAll = () =>
    persist({ analytics: false, personalization: false, marketing: false });
  const saveCustom = () => persist({ analytics, personalization, marketing });

  const isIN = region === 'IN';
  const isEU = region === 'EU';

  return (
    <View style={styles.sheet} accessibilityRole="alert" accessibilityLabel="Privacy preferences">
      <Text style={styles.copy}>
        {isIN
          ? 'Miamo uses essential cookies to keep you signed in. With your consent we also collect anonymous usage analytics to improve matches. You can change this any time in Settings → Privacy.'
          : isEU
            ? 'We use a small set of cookies. Essential cookies are required for the app to work. Analytics and personalization are off until you opt in. You can withdraw consent at any time.'
            : 'Help us improve Miamo by allowing anonymous usage analytics and personalization. Everything is opt-in and you can change it any time.'}
      </Text>

      {expanded ? (
        <View style={styles.optGroup}>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Analytics (anonymous usage)</Text>
            <Switch value={analytics} onValueChange={setAnalytics} />
          </View>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Personalization (smarter matches)</Text>
            <Switch value={personalization} onValueChange={setPersonalization} />
          </View>
          <View style={styles.optRow}>
            <Text style={styles.optLabel}>Marketing (currently unused)</Text>
            <Switch value={marketing} onValueChange={setMarketing} />
          </View>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable onPress={acceptAll} style={[styles.btn, styles.btnPrimary]}>
          <Text style={styles.btnPrimaryText}>Accept</Text>
        </Pressable>
        <Pressable onPress={rejectAll} style={[styles.btn, styles.btnSecondary]}>
          <Text style={styles.btnSecondaryText}>Reject non-essential</Text>
        </Pressable>
        {expanded ? (
          <Pressable onPress={saveCustom} style={[styles.btn, styles.btnSoft]}>
            <Text style={styles.btnSoftText}>Save choices</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => setExpanded(true)} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>Customize</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  copy: { fontSize: 13, color: '#333', lineHeight: 18 },
  optGroup: { marginTop: 12, gap: 8 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  optLabel: { fontSize: 13, color: '#333' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  btn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  btnPrimary: { backgroundColor: '#e11d48' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnSecondary: { backgroundColor: '#f0f0f0' },
  btnSecondaryText: { color: '#1a1a1a', fontSize: 13, fontWeight: '500' },
  btnSoft: { backgroundColor: '#fde2e5' },
  btnSoftText: { color: '#b91c39', fontSize: 13, fontWeight: '500' },
  btnGhost: { backgroundColor: 'transparent' },
  btnGhostText: { color: '#666', fontSize: 13, textDecorationLine: 'underline' },
});

export default ConsentBanner;
