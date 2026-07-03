// Miamo Mobile — Notifications inbox.
// Web parity: services/web/src/app/(main)/notifications/page.tsx.
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
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function NotificationsScreen() {
  useTrackPageView('notifications');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setItems(res?.data ?? []);
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

  const markRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setItems(current => current.map(n => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // best-effort
    }
  }, []);

  if (loading)
    return (
      <View style={styles.center} testID="notifications-loading">
        <ActivityIndicator />
      </View>
    );
  if (error) return <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />;
  if (items.length === 0) return <EmptyState title="No notifications" actionLabel="Refresh" onAction={load} />;

  return (
    <SafeAreaView style={styles.wrap} testID="notifications-screen">
      <FlatList
        data={items}
        keyExtractor={(n: any) => n.id}
        refreshing={loading}
        onRefresh={load}
        renderItem={({ item }: any) => (
          <Pressable
            testID={`notification-${item.id}`}
            onPress={() => markRead(item.id)}
            style={[styles.row, !item.read && styles.unread]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  unread: { backgroundColor: '#fff9e6' },
  title: { fontSize: 15, fontWeight: '600' },
  body: { fontSize: 13, color: '#555', marginTop: 4 },
});
