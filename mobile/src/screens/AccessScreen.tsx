// Miamo Mobile — DTM access requests.
// Web parity: services/web/src/app/(main)/access/page.tsx.
// Shows incoming + sent access requests. Grants/denies incoming.
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
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

type Tab = 'incoming' | 'sent';

export default function AccessScreen() {
  useTrackPageView('access');
  const [tab, setTab] = useState<Tab>('incoming');
  const [incoming, setIncoming] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, snt] = await Promise.all([
        api.getIncomingAccessRequests().catch(() => ({ data: [] })),
        api.getSentAccessRequests().catch(() => ({ data: [] })),
      ]);
      setIncoming(inc?.data ?? []);
      setSent(snt?.data ?? []);
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

  async function handle(id: string, action: 'grant' | 'deny') {
    try {
      await api.handleAccessRequest(id, action);
      setIncoming(cur => cur.filter(x => x.id !== id));
      toast.success(action === 'grant' ? 'Granted' : 'Denied');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  if (loading)
    return (
      <View style={styles.center} testID="access-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;

  const data = tab === 'incoming' ? incoming : sent;

  return (
    <SafeAreaView style={styles.wrap} testID="access-screen">
      <View style={styles.tabs}>
        {(['incoming', 'sent'] as const).map(t => (
          <Pressable
            key={t}
            testID={`access-tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabActiveText : styles.tabText}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={data}
        keyExtractor={(x: any) => x.id}
        ListEmptyComponent={<EmptyState title={`No ${tab} requests`} />}
        renderItem={({ item }: any) => (
          <View style={styles.row} testID={`access-request-${item.id}`}>
            <View style={styles.body}>
              <Text style={styles.name}>{item.requester?.displayName ?? item.target?.displayName ?? 'Someone'}</Text>
              <Text style={styles.meta}>{item.accessType} · {item.status ?? 'pending'}</Text>
            </View>
            {tab === 'incoming' && item.status !== 'granted' && item.status !== 'denied' ? (
              <View style={styles.actions}>
                <Pressable
                  testID={`access-grant-${item.id}`}
                  onPress={() => handle(item.id, 'grant')}
                  style={[styles.actionBtn, styles.grant]}>
                  <Text style={styles.actionText}>Grant</Text>
                </Pressable>
                <Pressable
                  testID={`access-deny-${item.id}`}
                  onPress={() => handle(item.id, 'deny')}
                  style={[styles.actionBtn, styles.deny]}>
                  <Text style={styles.actionText}>Deny</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  tabActive: { backgroundColor: '#111', borderColor: '#111' },
  tabText: { color: '#111', textTransform: 'capitalize' },
  tabActiveText: { color: '#fff', textTransform: 'capitalize' },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  grant: { backgroundColor: '#1a8a34' },
  deny: { backgroundColor: '#c92222' },
  actionText: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
