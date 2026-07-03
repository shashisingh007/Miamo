// Miamo Mobile — Admin fairness (Gini coefficient dashboard).
// Web parity: services/web/src/app/(main)/admin/fairness/page.tsx.
//
// Renders a table + summary of the network's exposure Gini metric. Admin
// only — AppNavigator guards the route behind user.isAdmin.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { useAuth } from '@hooks/useAuth';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function FairnessScreen() {
  useTrackPageView('admin-fairness');
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await (api as any).getAdminFairnessGini?.();
      setData((res as any)?.data ?? res ?? null);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <EmptyState
        title="Admins only"
        message="You need admin access to see this page."
      />
    );
  }
  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="fairness-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load"
        message={error}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  const rows: any[] = Array.isArray(data?.buckets)
    ? data.buckets
    : Array.isArray(data)
      ? data
      : [];

  return (
    <SafeAreaView style={styles.wrap} testID="fairness-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Fairness · Gini</Text>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Overall Gini</Text>
          <Text style={styles.summaryValue}>
            {typeof data?.gini === 'number' ? data.gini.toFixed(3) : '—'}
          </Text>
          <Text style={styles.help}>
            {typeof data?.gini === 'number'
              ? interpretGini(data.gini)
              : 'No data.'}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.rowHeader]}>
            <Text style={[styles.cell, styles.cellHead]}>Bucket</Text>
            <Text style={[styles.cell, styles.cellHead]}>Users</Text>
            <Text style={[styles.cell, styles.cellHead]}>Exposure</Text>
            <Text style={[styles.cell, styles.cellHead]}>Share</Text>
          </View>
          {rows.length === 0 ? (
            <Text style={styles.meta}>No bucket data.</Text>
          ) : (
            rows.map((r: any, i: number) => (
              <View key={r.bucket ?? i} style={styles.row}>
                <Text style={styles.cell}>{r.bucket ?? r.name ?? i + 1}</Text>
                <Text style={styles.cell}>{r.users ?? '—'}</Text>
                <Text style={styles.cell}>{r.exposure ?? '—'}</Text>
                <Text style={styles.cell}>
                  {r.share != null ? `${(r.share * 100).toFixed(1)}%` : '—'}
                </Text>
              </View>
            ))
          )}
        </View>

        {data?.notes ? (
          <Text style={styles.notes}>{data.notes}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function interpretGini(g: number) {
  if (g < 0.2) return 'Very fair distribution.';
  if (g < 0.35) return 'Reasonably fair.';
  if (g < 0.5) return 'Some concentration — worth monitoring.';
  return 'High concentration — investigate exposure caps.';
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12, color: '#111' },
  summary: {
    backgroundColor: '#f9f9fb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  summaryLabel: { fontSize: 12, color: '#666', fontWeight: '700' },
  summaryValue: { fontSize: 34, fontWeight: '800', color: '#111', marginTop: 4 },
  help: { fontSize: 13, color: '#555', marginTop: 6 },
  table: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  rowHeader: { backgroundColor: '#f7f7f9' },
  cell: { flex: 1, fontSize: 13, color: '#333' },
  cellHead: { color: '#666', fontWeight: '700' },
  meta: { color: '#666', textAlign: 'center', padding: 12 },
  notes: { color: '#555', fontSize: 12, marginTop: 12 },
});
