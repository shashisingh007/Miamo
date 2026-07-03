// Miamo Mobile — DTM (Date-to-Marry) hub.
// Web parity: services/web/src/app/(main)/dtm/page.tsx.
//
// Sections:
//   • My DTM Profile — quick edit link, uses getMatrimonialProfile / updateMatrimonialProfile.
//   • Discover — grid via browseMatrimonial.
//   • My Matches — matrimonialMatches.
//   • Access Requests — incoming + sent, with grant/deny/revoke actions.
//   • DTM Chat — link to DtmChatScreen.
//   • Family Brief — FamilyBrief share widget.
//   • Templates — getMatrimonialTemplates.
//   • Kundli / Numerology sub-screen links.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import FamilyBrief from '@components/FamilyBrief';
import { toast } from '@components/Toast';
import ConfirmDialog from '@components/ConfirmDialog';
import { useTrackPageView } from '@hooks/useTrackActivity';
import type { RootStackParamList } from '@/navigation/AppNavigator';

export default function DtmScreen() {
  useTrackPageView('dtm');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [profile, setProfile] = useState<any>(null);
  const [browse, setBrowse] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    action: 'grant' | 'deny' | 'revoke';
    userName?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b, m, inc, s, tpl] = await Promise.all([
        api.getMatrimonialProfile().catch(() => null),
        api.browseMatrimonial().catch(() => ({ data: [] })),
        api.getMatrimonialMatches().catch(() => ({ data: [] })),
        api.getIncomingAccessRequests().catch(() => ({ data: [] })),
        api.getSentAccessRequests().catch(() => ({ data: [] })),
        (api as any).getMatrimonialTemplates
          ? (api as any).getMatrimonialTemplates().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setProfile((p as any)?.data ?? null);
      setBrowse((b as any)?.data ?? []);
      setMatches((m as any)?.data ?? []);
      setIncoming((inc as any)?.data ?? []);
      setSent((s as any)?.data ?? []);
      setTemplates((tpl as any)?.data ?? []);
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

  const runAccess = useCallback(async () => {
    if (!pendingAction) return;
    try {
      await api.handleAccessRequest(pendingAction.id, pendingAction.action);
      toast.success(`${pendingAction.action}ed`);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPendingAction(null);
    }
  }, [pendingAction, load]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} testID="dtm-loading">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Couldn't load DTM"
        message={error}
        actionLabel="Retry"
        onAction={load}
      />
    );
  }

  return (
    <SafeAreaView style={styles.wrap} testID="dtm-screen">
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Date to Marry</Text>

        {/* My DTM profile */}
        <Section title="My DTM profile">
          {profile ? (
            <View>
              <Text style={styles.rowName}>
                {profile.displayName ?? 'You'}
              </Text>
              <Text style={styles.rowMeta}>
                {profile.religion ?? '—'} · {profile.community ?? '—'} ·{' '}
                {profile.motherTongue ?? '—'}
              </Text>
              <Pressable
                testID="dtm-edit-profile"
                onPress={() => navigation.navigate('ProfileEdit')}
                style={styles.chip}>
                <Text style={styles.chipText}>Edit</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={styles.meta}>
                Set up your DTM profile to see matches.
              </Text>
              <Pressable
                testID="dtm-create-profile"
                onPress={() => navigation.navigate('ProfileEdit')}
                style={styles.chip}>
                <Text style={styles.chipText}>Set up</Text>
              </Pressable>
            </View>
          )}
        </Section>

        {/* Family brief */}
        <Section title="Family brief">
          <FamilyBrief />
        </Section>

        {/* Kundli + Numerology + DTM Chat quick links */}
        <Section title="Tools">
          <View style={styles.chipRow}>
            <NavChip
              testID="dtm-open-chat"
              label="DTM Chat"
              onPress={() => navigation.navigate('DtmChat')}
            />
            <NavChip
              testID="dtm-open-kundli"
              label="Kundli"
              onPress={() => navigation.navigate('Kundli', {})}
            />
            <NavChip
              testID="dtm-open-numerology"
              label="Numerology"
              onPress={() => navigation.navigate('Numerology', {})}
            />
          </View>
        </Section>

        {/* Discover */}
        <Section title="Discover">
          <FlatList
            data={browse.slice(0, 20)}
            keyExtractor={(item: any) => item.userId ?? item.id}
            horizontal
            scrollEnabled
            renderItem={({ item }) => (
              <Pressable
                testID={`dtm-browse-${item.userId ?? item.id}`}
                onPress={() =>
                  navigation.navigate('Compatibility', {
                    targetUserId: item.userId ?? item.id,
                  })
                }
                style={styles.card}>
                <View style={styles.thumb} />
                <Text style={styles.cardName}>
                  {item.displayName ?? 'Someone'}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.age ? `${item.age} · ` : ''}
                  {item.city ?? ''}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.meta}>No candidates.</Text>}
          />
        </Section>

        {/* Matches */}
        <Section title={`My matches (${matches.length})`}>
          {matches.length === 0 ? (
            <Text style={styles.meta}>No mutual DTM matches yet.</Text>
          ) : (
            matches.slice(0, 5).map((m: any) => (
              <Pressable
                key={m.id}
                testID={`dtm-match-${m.id}`}
                onPress={() => navigation.navigate('DtmMatch')}
                style={styles.matchRow}>
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {m.matchedUser?.displayName ?? 'Someone'}
                  </Text>
                  <Text style={styles.rowMeta}>Mutual DTM interest</Text>
                </View>
              </Pressable>
            ))
          )}
        </Section>

        {/* Access requests */}
        <Section title={`Incoming access requests (${incoming.length})`}>
          {incoming.length === 0 ? (
            <Text style={styles.meta}>No incoming requests.</Text>
          ) : (
            incoming.map((r: any) => (
              <View
                key={r.id}
                style={styles.matchRow}
                testID={`dtm-inc-${r.id}`}>
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {r.requester?.displayName ?? 'Someone'}
                  </Text>
                  <Text style={styles.rowMeta}>{r.accessType} · {r.status}</Text>
                </View>
                <View style={styles.rowActions}>
                  <ChipBtn
                    testID={`dtm-grant-${r.id}`}
                    label="Grant"
                    onPress={() =>
                      setPendingAction({
                        id: r.id,
                        action: 'grant',
                        userName: r.requester?.displayName,
                      })
                    }
                  />
                  <ChipBtn
                    testID={`dtm-deny-${r.id}`}
                    label="Deny"
                    ghost
                    onPress={() =>
                      setPendingAction({
                        id: r.id,
                        action: 'deny',
                        userName: r.requester?.displayName,
                      })
                    }
                  />
                </View>
              </View>
            ))
          )}
        </Section>

        <Section title={`Sent (${sent.length})`}>
          {sent.length === 0 ? (
            <Text style={styles.meta}>No pending sent requests.</Text>
          ) : (
            sent.map((r: any) => (
              <View
                key={r.id}
                style={styles.matchRow}
                testID={`dtm-sent-${r.id}`}>
                <View style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {r.target?.displayName ?? 'Someone'}
                  </Text>
                  <Text style={styles.rowMeta}>{r.accessType} · {r.status}</Text>
                </View>
                <ChipBtn
                  testID={`dtm-revoke-${r.id}`}
                  label="Revoke"
                  ghost
                  onPress={() =>
                    setPendingAction({
                      id: r.id,
                      action: 'revoke',
                      userName: r.target?.displayName,
                    })
                  }
                />
              </View>
            ))
          )}
        </Section>

        {/* Templates */}
        <Section title={`Templates (${templates.length})`}>
          {templates.length === 0 ? (
            <Text style={styles.meta}>No templates available.</Text>
          ) : (
            templates.slice(0, 6).map((t: any, i: number) => (
              <View key={t.id ?? i} style={styles.templateCard}>
                <Text style={styles.rowName}>{t.title ?? 'Template'}</Text>
                <Text style={styles.rowMeta}>{t.body ?? ''}</Text>
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingAction}
        title={`${pendingAction?.action === 'revoke' ? 'Revoke' : pendingAction?.action === 'grant' ? 'Grant' : 'Deny'} access?`}
        message={
          pendingAction?.userName
            ? `${pendingAction.userName} will be notified.`
            : undefined
        }
        confirmLabel={
          pendingAction?.action === 'grant' ? 'Grant' : pendingAction?.action === 'deny' ? 'Deny' : 'Revoke'
        }
        danger={pendingAction?.action !== 'grant'}
        onCancel={() => setPendingAction(null)}
        onConfirm={runAccess}
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function NavChip({
  testID,
  label,
  onPress,
}: {
  testID: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.navChip}>
      <Text style={styles.navChipText}>{label}</Text>
    </Pressable>
  );
}

function ChipBtn({
  testID,
  label,
  onPress,
  ghost,
}: {
  testID: string;
  label: string;
  onPress: () => void;
  ghost?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, ghost && styles.chipGhost]}>
      <Text style={ghost ? styles.chipGhostText : styles.chipText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#f7f7f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, color: '#111' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  card: {
    padding: 10,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    width: 130,
  },
  thumb: {
    width: 110,
    height: 110,
    borderRadius: 8,
    backgroundColor: '#ddd',
    marginBottom: 6,
  },
  cardName: { fontSize: 13, fontWeight: '700', color: '#111' },
  cardMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  rowName: { fontSize: 14, fontWeight: '700', color: '#111' },
  rowMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  rowActions: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#111',
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  chipText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  chipGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  chipGhostText: { color: '#111', fontWeight: '600', fontSize: 12 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  navChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  navChipText: { color: '#fff', fontWeight: '700' },
  templateCard: {
    padding: 10,
    backgroundColor: '#f9f9fb',
    borderRadius: 10,
    marginBottom: 8,
  },
});
