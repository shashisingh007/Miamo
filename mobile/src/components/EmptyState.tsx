// Miamo Mobile — EmptyState. Rendered when a list has zero results.
// Mirrors the web EmptyState (services/web/src/components/ui/EmptyState.tsx).
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.wrap} testID="empty-state">
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable
          testID="empty-state-action"
          accessibilityRole="button"
          onPress={onAction}
          style={styles.btn}>
          <Text style={styles.btnText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#111', textAlign: 'center' },
  message: { fontSize: 14, color: '#666', textAlign: 'center' },
  btn: { marginTop: 12, backgroundColor: '#111', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
});
