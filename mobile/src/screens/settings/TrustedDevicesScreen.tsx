// Miamo Mobile — Settings › Trusted devices.
// Lists devices that have completed 2FA and are trusted for 30 days. Each
// row can be revoked; the current device is flagged and requires a stronger
// confirm.
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

interface TrustedDevice {
  id: string;
  name?: string;
  platform?: string;
  lastSeenAt?: string;
  current?: boolean;
}

export default function TrustedDevicesScreen() {
  const [items, setItems] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TrustedDevice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listTrustedDevices();
      setItems(((res as any)?.data ?? []) as TrustedDevice[]);
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

  async function revoke(d: TrustedDevice) {
    setPending(d.id);
    try {
      await api.revokeTrustedDevice(d.id);
      setItems(cur => cur.filter(x => x.id !== d.id));
      toast.success('Device revoked');
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
        title="No trusted devices"
        message="Devices you sign in on will show up here."
        actionLabel="Refresh"
        onAction={load}
      />
    );

  return (
    <SafeAreaView style={styles.wrap} testID="settings-devices">
      <Text style={styles.title}>Trusted devices</Text>
      <FlatList
        data={items}
        keyExtractor={x => x.id}
        renderItem={({ item }) => (
          <View style={styles.row} testID={`device-row-${item.id}`}>
            <View style={styles.body}>
              <Text style={styles.name}>
                {item.name ?? 'Device'} {item.current ? '· this device' : ''}
              </Text>
              <Text style={styles.meta}>
                {item.platform ?? 'unknown'}
                {item.lastSeenAt ? ` · last seen ${new Date(item.lastSeenAt).toLocaleString()}` : ''}
              </Text>
            </View>
            <Pressable
              testID={`revoke-${item.id}`}
              onPress={() => setConfirming(item)}
              disabled={pending === item.id}
              style={[styles.btn, pending === item.id && styles.btnDisabled]}>
              {pending === item.id ? (
                <ActivityIndicator color="#c92222" />
              ) : (
                <Text style={styles.btnText}>Revoke</Text>
              )}
            </Pressable>
          </View>
        )}
      />
      <ConfirmDialog
        visible={!!confirming}
        title={confirming?.current ? 'Revoke this device?' : 'Revoke device access?'}
        message={
          confirming?.current
            ? 'You will be signed out of this device and asked to re-verify.'
            : 'Anyone using that device will need to sign in again.'
        }
        confirmLabel="Revoke"
        danger
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && revoke(confirming)}
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
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c92222',
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#c92222', fontWeight: '600' },
});
