// Miamo Mobile — All Caught Up screen.
// Web parity: services/web/src/components/deferred/AllCaughtUpScreen.tsx.
// Terminal empty state for Discover / DTM. If there are deferred items
// pending, tapping the primary CTA opens a DeferredPileModal so users can
// revisit the pile without leaving the surface. Purely presentational —
// the parent owns the pile state and deferred count.
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '@lib/api';
import DeferredPileModal, { type DeferredSurface } from './DeferredPileModal';

export interface AllCaughtUpScreenProps {
  surface: DeferredSurface;
  /** If omitted, this component fetches the pending pile itself. */
  deferredCount?: number;
  onAdjustFilters?: () => void;
  primaryLabel?: string;
  secondaryLabel?: string;
  message?: string;
  /** Fires after the user resolves items in the pile modal. */
  onPileChanged?: () => void;
}

export default function AllCaughtUpScreen({
  surface,
  deferredCount,
  onAdjustFilters,
  primaryLabel,
  secondaryLabel,
  message,
  onPileChanged,
}: AllCaughtUpScreenProps) {
  const [autoCount, setAutoCount] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchCount = useCallback(async () => {
    if (deferredCount != null) return;
    try {
      const res: any = await api.listDeferred({
        surface,
        kind: 'pending',
        limit: 100,
      });
      const arr = res?.data?.items || res?.data || [];
      setAutoCount(Array.isArray(arr) ? arr.length : 0);
    } catch {
      setAutoCount(0);
    }
  }, [surface, deferredCount]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const count = deferredCount ?? autoCount ?? 0;

  const heading =
    surface === 'discover'
      ? "You're all caught up"
      : "Today's questions are done";
  const defaultMessage =
    surface === 'discover'
      ? 'New people show up every day. Take a breath, or pick up where you left off below.'
      : 'Come back tomorrow for fresh questions, or revisit ones you set aside.';

  return (
    <View style={styles.wrap} testID="all-caught-up">
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{surface === 'discover' ? '♥' : '✦'}</Text>
      </View>
      <Text style={styles.eyebrow}>ALL CAUGHT UP</Text>
      <Text style={styles.heading}>{heading}</Text>
      <Text style={styles.body}>{message ?? defaultMessage}</Text>
      <View style={styles.actions}>
        {count > 0 ? (
          <Pressable
            testID="all-caught-up-view-deferred"
            accessibilityRole="button"
            onPress={() => setModalOpen(true)}
            style={styles.primary}>
            <Text style={styles.primaryText}>
              {primaryLabel ?? `View ${count} deferred`}
            </Text>
          </Pressable>
        ) : null}
        {onAdjustFilters ? (
          <Pressable
            testID="all-caught-up-adjust-filters"
            accessibilityRole="button"
            onPress={onAdjustFilters}
            style={styles.secondary}>
            <Text style={styles.secondaryText}>
              {secondaryLabel ?? 'Adjust filters'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <DeferredPileModal
        surface={surface}
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
          fetchCount();
          onPileChanged?.();
        }}
        onResolved={() => {
          onPileChanged?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ffe6ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 32, color: '#c92244' },
  eyebrow: {
    fontSize: 11,
    color: '#c92244',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: { gap: 10, alignItems: 'center', width: '100%' },
  primary: {
    backgroundColor: '#c92244',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondary: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  secondaryText: { color: '#333', fontWeight: '600' },
});
