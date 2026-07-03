// Miamo Mobile — Settings › Blocked users.
// Lists blocked users from api.getBlockList and offers per-row Unblock
// gated by ConfirmDialog. Errors surface via toast so the list stays visible.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';

interface BlockedUser {
  id: string;
  blockedId: string;
  blockedUser?: { displayName?: string; avatarUrl?: string };
  createdAt?: string;
}

export default function BlockedUsersScreen() {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<BlockedUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getBlockList();
      setItems(((res as any)?.data ?? []) as BlockedUser[]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function unblock(u: BlockedUser) {
    setPending(u.blockedId);
    try {
      await api.unblockUser(u.blockedId);
      setItems(cur => cur.filter(x => x.blockedId !== u.blockedId));
      toast.success('Unblocked');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPending(null);
      setConfirming(null);
    }
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  if (error)
    return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;
  if (items.length === 0)
    return (
      <EmptyState
        title="No blocked users"
        message="Anyone you block will appear here."
        actionLabel="Refresh"
        onAction={load}
      />
    );

  return (
    <SafeAreaView style={styles.wrap} testID="settings-blocked">
      <Text style={styles.title}>Blocked users</Text>
      <FlatList
        data={items}
        keyExtractor={x => x.blockedId}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`blocked-row-${item.blockedId}`}>
            <View style={styles.avatar} />
            <View style={styles.body}>
              <Text style={styles.name}>{item.blockedUser?.displayName ?? 'Someone'}</Text>
              {item.createdAt ? (
                <Text style={styles.meta}>Blocked {new Date(item.createdAt).toLocaleDateString()}</Text>
              ) : null}
            </View>
            <Pressable
              testID={`unblock-${item.blockedId}`}
              onPress={() => setConfirming(item)}
              disabled={pending === item.blockedId}
              style={[styles.btn, pending === item.blockedId && styles.btnDisabled]}>
              {pending === item.blockedId ? (
                <ActivityIndicator color="#111" />
              ) : (
                <Text style={styles.btnText}>Unblock</Text>
              )}
            </Pressable>
          </View>
        )}
      />
      <ConfirmDialog
        visible={!!confirming}
        title="Unblock this user?"
        message="They will be able to see your profile and message you again."
        confirmLabel="Unblock"
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && unblock(confirming)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    gap: 12,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ddd' },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666' },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#111',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#111', fontWeight: '600' },
});
