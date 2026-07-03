// Miamo Mobile — Deferred pile modal.
// Web parity: services/web/src/components/deferred/DeferredPileModal.tsx.
// Lists items the user previously "see-latered" on a surface (Discover or DTM),
// letting them resolve each with a final action. Owns fetch + resolve
// plumbing; renderItem lets callers project surface-specific row content.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '@lib/api';

export type DeferredSurface = 'discover' | 'dtm';
export type DeferAction =
  | 'like'
  | 'pass'
  | 'super_like'
  | 'see_later'
  | 'answered'
  | 'skipped';

export interface DeferredItem {
  id: string;
  surface: string;
  targetId: string;
  topic: string | null;
  deferredAt: string;
  viewedAt: string | null;
  resolvedAt: string | null;
  resolvedAction: string | null;
}

export interface DeferredPileModalProps {
  surface: DeferredSurface;
  visible: boolean;
  onClose: () => void;
  /** Custom row body renderer. Defaults to a compact target id/topic summary. */
  renderItem?: (item: DeferredItem) => React.ReactNode;
  emptyText?: string;
  title?: string;
  /** Fires after a successful resolve so parents can refresh their deferred badge. */
  onResolved?: (item: DeferredItem, action: DeferAction) => void;
}

export default function DeferredPileModal({
  surface,
  visible,
  onClose,
  renderItem,
  emptyText = 'No deferred items.',
  title,
  onResolved,
}: DeferredPileModalProps) {
  const [items, setItems] = useState<DeferredItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await api.listDeferred({
        surface,
        kind: 'pending',
        limit: 100,
      });
      const arr = (res?.data?.items || res?.data || []) as DeferredItem[];
      setItems(Array.isArray(arr) ? arr : []);
    } catch (err) {
      setItems([]);
      setError((err as Error).message || 'Could not load deferred pile');
    } finally {
      setLoading(false);
    }
  }, [surface]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  const handleView = useCallback(async (item: DeferredItem) => {
    try {
      await api.viewDeferred(item.id);
    } catch {
      // best-effort
    }
  }, []);

  const handleResolve = useCallback(
    async (item: DeferredItem, action: DeferAction) => {
      setBusyId(item.id);
      try {
        await api.resolveDeferred(item.id, action);
        setItems(prev => prev.filter(i => i.id !== item.id));
        onResolved?.(item, action);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusyId(null);
      }
    },
    [onResolved],
  );

  const headerTitle =
    title ??
    (surface === 'discover' ? 'Deferred profiles' : 'Deferred questions');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID="deferred-pile-modal">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>{headerTitle}</Text>
              <Text style={styles.count}>{items.length}</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.close}
              testID="deferred-close">
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.empty}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={i => i.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <View
                  style={styles.row}
                  testID={`deferred-row-${item.id}`}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => handleView(item)}
                    style={styles.rowBody}>
                    {renderItem ? (
                      renderItem(item)
                    ) : (
                      <View>
                        <Text style={styles.rowTitle}>{item.targetId}</Text>
                        {item.topic ? (
                          <Text style={styles.rowMeta}>Topic: {item.topic}</Text>
                        ) : null}
                        <Text style={styles.rowSub}>
                          Deferred{' '}
                          {new Date(item.deferredAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                  <View style={styles.actions}>
                    {surface === 'discover' ? (
                      <>
                        <ActionBtn
                          testID={`deferred-pass-${item.id}`}
                          label="Pass"
                          onPress={() => handleResolve(item, 'pass')}
                          disabled={busyId === item.id}
                          variant="ghost"
                        />
                        <ActionBtn
                          testID={`deferred-like-${item.id}`}
                          label="Like"
                          onPress={() => handleResolve(item, 'like')}
                          disabled={busyId === item.id}
                        />
                        <ActionBtn
                          testID={`deferred-super-${item.id}`}
                          label="★"
                          onPress={() => handleResolve(item, 'super_like')}
                          disabled={busyId === item.id}
                          variant="ghost"
                        />
                      </>
                    ) : (
                      <>
                        <ActionBtn
                          testID={`deferred-skip-${item.id}`}
                          label="Skip"
                          onPress={() => handleResolve(item, 'skipped')}
                          disabled={busyId === item.id}
                          variant="ghost"
                        />
                        <ActionBtn
                          testID={`deferred-answer-${item.id}`}
                          label="Answer now"
                          onPress={() => handleResolve(item, 'answered')}
                          disabled={busyId === item.id}
                        />
                      </>
                    )}
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ActionBtn({
  testID,
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  testID: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionBtn,
        variant === 'primary' ? styles.actionPrimary : styles.actionGhost,
        disabled && styles.disabled,
      ]}>
      <Text
        style={
          variant === 'primary'
            ? styles.actionPrimaryText
            : styles.actionGhostText
        }>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  count: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  close: { padding: 6 },
  closeText: { color: '#c92222', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  empty: { color: '#666', textAlign: 'center' },
  error: { color: '#c92222', padding: 12, textAlign: 'center' },
  row: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    marginBottom: 10,
  },
  rowBody: { paddingBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: '#111' },
  rowMeta: { fontSize: 12, color: '#555', marginTop: 2 },
  rowSub: { fontSize: 11, color: '#888', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionPrimary: { backgroundColor: '#111' },
  actionGhost: { borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  actionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  actionGhostText: { color: '#333', fontWeight: '600', fontSize: 12 },
  disabled: { opacity: 0.4 },
});
