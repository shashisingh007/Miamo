// Miamo Mobile — Matches.
// Web parity: services/web/src/app/(main)/matches/page.tsx.
//
// Tabs:
//   • Matches         — current matches (long-press → favorite/pin/report/unmatch)
//   • Incoming Likes  — people who liked you (accept back / hold / hide / see suggestions)
//   • Requests        — match requests (accept / reject)
//   • Sent            — outgoing requests (read-only status)
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import MoveV2Picker from '@components/MoveV2Picker';
import { toast } from '@components/Toast';
import { useMatchesStore } from '@stores/matchesStore';
import { useTrackPageView } from '@hooks/useTrackActivity';
import type { RootStackParamList } from '@/navigation/AppNavigator';

type Tab = 'matches' | 'incoming' | 'requests' | 'sent';

const UNMATCH_REASONS = [
  { value: 'not_a_fit', label: 'Not a fit' },
  { value: 'no_response', label: "They didn't respond" },
  { value: 'creepy', label: 'Creepy vibes' },
  { value: 'ghosted', label: 'Ghosted' },
  { value: 'other', label: 'Other' },
];
const REPORT_REASONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'fake', label: 'Fake profile' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export default function MatchesScreen() {
  useTrackPageView('matches');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { matches, incoming, refresh } = useMatchesStore();

  const [tab, setTab] = useState<Tab>('matches');
  const [requests, setRequests] = useState<any[]>([]);
  const [sent, setSent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contextMatch, setContextMatch] = useState<any | null>(null);
  const [contextIncoming, setContextIncoming] = useState<any | null>(null);
  const [showMoveFor, setShowMoveFor] = useState<any | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [confirmUnmatch, setConfirmUnmatch] = useState<any | null>(null);
  const [confirmReport, setConfirmReport] = useState<any | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'matches' || tab === 'incoming') {
        await refresh();
      } else if (tab === 'requests') {
        const res = await api.getMatchRequests();
        setRequests(((res as any)?.data ?? []) as any[]);
      } else if (tab === 'sent') {
        const res = await api.getSentRequests();
        setSent(((res as any)?.data ?? []) as any[]);
      }
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab, refresh]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const openChat = useCallback(
    (m: any) => {
      navigation.navigate('Chat', { chatId: m.chatId ?? m.id, otherUser: m.matchedUser });
    },
    [navigation],
  );

  // ─── Match tab actions ─────────────────────────────
  async function favorite(m: any) {
    try {
      await api.favoriteMatch(m.id);
      toast.success('Favorited');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function pinMatch(m: any) {
    try {
      await api.pinMatch(m.id);
      toast.success('Pinned');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function reportMatch(m: any, reason: string) {
    try {
      await api.reportMatch(m.id, reason);
      toast.success('Reported — thank you');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmReport(null);
      setSelectedReason('');
    }
  }
  async function unmatch(m: any, reason: string) {
    try {
      await api.unmatch(m.id, reason);
      await refresh();
      toast.success('Unmatched');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmUnmatch(null);
      setSelectedReason('');
    }
  }

  // ─── Incoming tab actions ──────────────────────────
  async function matchBack(u: any) {
    try {
      await api.matchBack(u.userId ?? u.id);
      toast.success("It's a match!");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function matchBackWithMove(u: any, message: string) {
    try {
      await api.matchBackWithMove(u.userId ?? u.id, message);
      toast.success('Sent with your move');
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setShowMoveFor(null);
    }
  }
  async function holdIncoming(u: any) {
    try {
      await api.holdIncoming(u.userId ?? u.id);
      toast.info('On hold');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function resumeIncoming(u: any) {
    try {
      await api.resumeIncoming(u.userId ?? u.id);
      toast.info('Resumed');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function hideIncoming(u: any) {
    try {
      await api.hideIncoming(u.userId ?? u.id);
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function openSuggestions(u: any) {
    setShowSuggestions(u);
    try {
      const res = await api.getMatchSuggestions(u.userId ?? u.id);
      setSuggestions(((res as any)?.data ?? []) as any[]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function acceptRequest(r: any) {
    try {
      await api.acceptRequest(r.id);
      setRequests(cur => cur.filter(x => x.id !== r.id));
      toast.success('Accepted');
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function rejectRequest(r: any) {
    try {
      await api.rejectRequest(r.id);
      setRequests(cur => cur.filter(x => x.id !== r.id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isBusy = loading && matches.length === 0 && incoming.length === 0 && requests.length === 0;

  return (
    <SafeAreaView style={styles.wrap} testID="matches-screen">
      <View style={styles.tabRow}>
        {(['matches', 'incoming', 'requests', 'sent'] as const).map(t => (
          <Pressable
            key={t}
            testID={`matches-tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === 'incoming'
                ? `Likes${incoming.length ? ' (' + incoming.length + ')' : ''}`
                : t === 'requests'
                ? 'Requests'
                : t === 'sent'
                ? 'Sent'
                : 'Matches'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isBusy ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={loadTab} />
      ) : (
        <>
          {tab === 'matches' && (
            <FlatList
              data={matches}
              keyExtractor={(m: any) => m.id}
              refreshing={loading}
              onRefresh={loadTab}
              ListEmptyComponent={
                <EmptyState
                  title="No matches yet"
                  message="Head to Discover and see who's around."
                  actionLabel="Refresh"
                  onAction={loadTab}
                />
              }
              renderItem={({ item }: any) => (
                <Pressable
                  testID={`match-row-${item.id}`}
                  onPress={() => openChat(item)}
                  onLongPress={() => setContextMatch(item)}
                  style={styles.row}>
                  <View style={styles.avatar} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{item.matchedUser?.displayName ?? 'Someone'}</Text>
                    <Text style={styles.meta}>Matched · tap to chat, long-press for more</Text>
                  </View>
                </Pressable>
              )}
            />
          )}
          {tab === 'incoming' && (
            <FlatList
              data={incoming}
              keyExtractor={(x: any) => x.id ?? x.userId}
              refreshing={loading}
              onRefresh={loadTab}
              ListEmptyComponent={
                <EmptyState
                  title="No likes yet"
                  message="When someone likes you they'll appear here."
                  actionLabel="Refresh"
                  onAction={loadTab}
                />
              }
              renderItem={({ item }: any) => (
                <View style={styles.row} testID={`incoming-row-${item.id ?? item.userId}`}>
                  <View style={styles.avatar} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{item.user?.displayName ?? 'Someone'}</Text>
                    <Text style={styles.meta}>
                      {item.reason ?? 'Liked you'}
                    </Text>
                  </View>
                  <Pressable
                    testID={`incoming-more-${item.id ?? item.userId}`}
                    onPress={() => setContextIncoming(item)}
                    style={styles.moreBtn}>
                    <Text style={styles.moreBtnText}>⋯</Text>
                  </Pressable>
                  <Pressable
                    testID={`incoming-match-${item.id ?? item.userId}`}
                    onPress={() => matchBack(item)}
                    style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Match</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
          {tab === 'requests' && (
            <FlatList
              data={requests}
              keyExtractor={(r: any) => r.id}
              refreshing={loading}
              onRefresh={loadTab}
              ListEmptyComponent={
                <EmptyState title="No requests" message="Match requests will show here." />
              }
              renderItem={({ item }: any) => (
                <View style={styles.row} testID={`req-row-${item.id}`}>
                  <View style={styles.avatar} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{item.user?.displayName ?? 'Someone'}</Text>
                    <Text style={styles.meta}>{item.message ?? 'wants to connect'}</Text>
                  </View>
                  <Pressable
                    testID={`req-reject-${item.id}`}
                    onPress={() => rejectRequest(item)}
                    style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Reject</Text>
                  </Pressable>
                  <Pressable
                    testID={`req-accept-${item.id}`}
                    onPress={() => acceptRequest(item)}
                    style={styles.primaryBtn}>
                    <Text style={styles.primaryBtnText}>Accept</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
          {tab === 'sent' && (
            <FlatList
              data={sent}
              keyExtractor={(r: any) => r.id}
              refreshing={loading}
              onRefresh={loadTab}
              ListEmptyComponent={
                <EmptyState title="Nothing sent" message="Your outgoing requests will appear here." />
              }
              renderItem={({ item }: any) => (
                <View style={styles.row} testID={`sent-row-${item.id}`}>
                  <View style={styles.avatar} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{item.user?.displayName ?? 'Someone'}</Text>
                    <Text style={styles.meta}>Status: {item.status ?? 'pending'}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}

      {/* Match context menu */}
      <Modal
        transparent
        animationType="fade"
        visible={!!contextMatch}
        onRequestClose={() => setContextMatch(null)}>
        <Pressable style={styles.backdrop} onPress={() => setContextMatch(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {contextMatch?.matchedUser?.displayName ?? 'Match'}
            </Text>
            <SheetAction
              label="Favorite"
              onPress={() => {
                contextMatch && favorite(contextMatch);
                setContextMatch(null);
              }}
            />
            <SheetAction
              label="Pin"
              onPress={() => {
                contextMatch && pinMatch(contextMatch);
                setContextMatch(null);
              }}
            />
            <SheetAction
              label="Report"
              danger
              onPress={() => {
                setConfirmReport(contextMatch);
                setContextMatch(null);
              }}
            />
            <SheetAction
              label="Unmatch"
              danger
              onPress={() => {
                setConfirmUnmatch(contextMatch);
                setContextMatch(null);
              }}
            />
            <SheetAction label="Cancel" onPress={() => setContextMatch(null)} />
          </View>
        </Pressable>
      </Modal>

      {/* Incoming context menu */}
      <Modal
        transparent
        animationType="fade"
        visible={!!contextIncoming}
        onRequestClose={() => setContextIncoming(null)}>
        <Pressable style={styles.backdrop} onPress={() => setContextIncoming(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {contextIncoming?.user?.displayName ?? 'Someone'}
            </Text>
            <SheetAction
              label="Match with a move"
              onPress={() => {
                setShowMoveFor(contextIncoming);
                setContextIncoming(null);
              }}
            />
            <SheetAction
              label="Hold"
              onPress={() => {
                contextIncoming && holdIncoming(contextIncoming);
                setContextIncoming(null);
              }}
            />
            <SheetAction
              label="Resume"
              onPress={() => {
                contextIncoming && resumeIncoming(contextIncoming);
                setContextIncoming(null);
              }}
            />
            <SheetAction
              label="Hide"
              onPress={() => {
                contextIncoming && hideIncoming(contextIncoming);
                setContextIncoming(null);
              }}
            />
            <SheetAction
              label="See suggestions"
              onPress={() => {
                contextIncoming && openSuggestions(contextIncoming);
                setContextIncoming(null);
              }}
            />
            <SheetAction label="Cancel" onPress={() => setContextIncoming(null)} />
          </View>
        </Pressable>
      </Modal>

      {/* Move picker */}
      <Modal
        transparent
        animationType="slide"
        visible={!!showMoveFor}
        onRequestClose={() => setShowMoveFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setShowMoveFor(null)}>
          <View style={[styles.sheet, { maxHeight: '75%' }]}>
            <Text style={styles.sheetTitle}>Pick a move</Text>
            {showMoveFor ? (
              <MoveV2Picker
                itemId={showMoveFor.userId ?? showMoveFor.id}
                onSelect={s => matchBackWithMove(showMoveFor, s.text)}
              />
            ) : null}
          </View>
        </Pressable>
      </Modal>

      {/* Suggestions modal */}
      <Modal
        transparent
        animationType="slide"
        visible={!!showSuggestions}
        onRequestClose={() => setShowSuggestions(null)}>
        <Pressable style={styles.backdrop} onPress={() => setShowSuggestions(null)}>
          <View style={[styles.sheet, { maxHeight: '75%' }]}>
            <Text style={styles.sheetTitle}>Similar profiles</Text>
            {suggestions.length === 0 ? (
              <ActivityIndicator />
            ) : (
              suggestions.map(s => (
                <View key={s.id} style={styles.suggestionRow}>
                  <View style={styles.avatar} />
                  <View style={styles.body}>
                    <Text style={styles.name}>{s.displayName}</Text>
                    <Text style={styles.meta}>
                      {s.age ? `${s.age} · ` : ''}
                      {s.city ?? ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Confirm unmatch */}
      <Modal
        transparent
        animationType="fade"
        visible={!!confirmUnmatch}
        onRequestClose={() => setConfirmUnmatch(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmUnmatch(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Why are you unmatching?</Text>
            {UNMATCH_REASONS.map(r => (
              <Pressable
                key={r.value}
                onPress={() => setSelectedReason(r.value)}
                style={[styles.reasonBtn, selectedReason === r.value && styles.reasonBtnActive]}>
                <Text
                  style={
                    selectedReason === r.value ? styles.reasonTextActive : styles.reasonText
                  }>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <ConfirmDialog
        visible={!!confirmUnmatch && !!selectedReason}
        title="Unmatch?"
        message="You will lose your chat with this person."
        confirmLabel="Unmatch"
        danger
        onCancel={() => {
          setConfirmUnmatch(null);
          setSelectedReason('');
        }}
        onConfirm={() => confirmUnmatch && unmatch(confirmUnmatch, selectedReason)}
      />

      {/* Confirm report */}
      <Modal
        transparent
        animationType="fade"
        visible={!!confirmReport}
        onRequestClose={() => setConfirmReport(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmReport(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Report — why?</Text>
            {REPORT_REASONS.map(r => (
              <Pressable
                key={r.value}
                onPress={() => setSelectedReason(r.value)}
                style={[styles.reasonBtn, selectedReason === r.value && styles.reasonBtnActive]}>
                <Text
                  style={
                    selectedReason === r.value ? styles.reasonTextActive : styles.reasonText
                  }>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
      <ConfirmDialog
        visible={!!confirmReport && !!selectedReason}
        title="Report this user?"
        message="Our safety team will review this within 24 hours."
        confirmLabel="Report"
        danger
        onCancel={() => {
          setConfirmReport(null);
          setSelectedReason('');
        }}
        onConfirm={() => confirmReport && reportMatch(confirmReport, selectedReason)}
      />
    </SafeAreaView>
  );
}

function SheetAction({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.sheetBtn}>
      <Text style={danger ? styles.sheetBtnDanger : styles.sheetBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', padding: 8, gap: 6 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabActive: { backgroundColor: '#111', borderColor: '#111' },
  tabText: { color: '#111', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: '700', fontSize: 12 },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
    gap: 8,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  primaryBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#111',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  secondaryBtnText: { color: '#111', fontWeight: '600', fontSize: 13 },
  moreBtn: { padding: 8 },
  moreBtnText: { fontSize: 18, color: '#111', fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, gap: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  sheetBtn: { paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { fontSize: 15, color: '#111', fontWeight: '600' },
  sheetBtnDanger: { fontSize: 15, color: '#c92222', fontWeight: '700' },
  reasonBtn: { padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 6 },
  reasonBtnActive: { backgroundColor: '#111', borderColor: '#111' },
  reasonText: { color: '#111' },
  reasonTextActive: { color: '#fff', fontWeight: '600' },
  suggestionRow: { flexDirection: 'row', padding: 8, gap: 8, alignItems: 'center' },
});
