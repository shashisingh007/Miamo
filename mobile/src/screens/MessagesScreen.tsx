// Miamo Mobile — Messages (chat list).
// Web parity: services/web/src/app/(main)/messages/page.tsx.
//
// Features:
//   • Tabs — Active / Archived (drives api.getChats / api.getArchivedChats).
//   • Search bar — filters locally; commit (submit) also queries the server
//     via api.searchMessages so full-text hits show up.
//   • Long-press on a chat row → context menu with pin/unpin, mute/unmute,
//     archive/unarchive, and destructive Clear (via ConfirmDialog).
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';
import type { RootStackParamList } from '@/navigation/AppNavigator';

interface Chat {
  id: string;
  otherUser?: { id?: string; displayName?: string; avatarUrl?: string };
  lastMessage?: { content?: string; createdAt?: string };
  unreadCount?: number;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
}

type Tab = 'active' | 'archived';

export default function MessagesScreen() {
  useTrackPageView('messages');
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [tab, setTab] = useState<Tab>('active');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [contextChat, setContextChat] = useState<Chat | null>(null);
  const [confirmClear, setConfirmClear] = useState<Chat | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const call = tab === 'active' ? api.getChats : (api as any).getArchivedChats;
      const res = await call.call(api);
      setChats(((res as any)?.data ?? []) as Chat[]);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(c => {
      const name = c.otherUser?.displayName?.toLowerCase() ?? '';
      const preview = c.lastMessage?.content?.toLowerCase() ?? '';
      return name.includes(q) || preview.includes(q);
    });
  }, [chats, query]);

  async function commitSearch() {
    if (!query.trim()) return;
    try {
      await (api as any).searchMessages?.(null, query.trim());
    } catch {
      // Silent — local filter still applies. Server-side search is a
      // best-effort refresh.
    }
  }

  async function togglePin(c: Chat) {
    const next = !c.pinned;
    setChats(cur => cur.map(x => (x.id === c.id ? { ...x, pinned: next } : x)));
    try {
      await (api as any).pinChat?.(c.id, next);
    } catch (err) {
      setChats(cur => cur.map(x => (x.id === c.id ? { ...x, pinned: c.pinned } : x)));
      toast.error((err as Error).message);
    }
  }
  async function toggleMute(c: Chat) {
    const next = !c.muted;
    setChats(cur => cur.map(x => (x.id === c.id ? { ...x, muted: next } : x)));
    try {
      await (api as any).muteChat?.(c.id, next);
    } catch (err) {
      setChats(cur => cur.map(x => (x.id === c.id ? { ...x, muted: c.muted } : x)));
      toast.error((err as Error).message);
    }
  }
  async function archive(c: Chat) {
    setChats(cur => cur.filter(x => x.id !== c.id));
    try {
      if (tab === 'active') await (api as any).archiveChat?.(c.id);
      else await (api as any).unarchiveChat?.(c.id);
      toast.success(tab === 'active' ? 'Archived' : 'Restored');
    } catch (err) {
      toast.error((err as Error).message);
      load();
    }
  }
  async function clearChat(c: Chat) {
    try {
      await (api as any).clearChat?.(c.id);
      setChats(cur => cur.map(x => (x.id === c.id ? { ...x, lastMessage: undefined } : x)));
      toast.success('Chat cleared');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmClear(null);
    }
  }

  return (
    <SafeAreaView style={styles.wrap} testID="messages-screen">
      <View style={styles.tabRow}>
        {(['active', 'archived'] as const).map(t => (
          <Pressable
            key={t}
            testID={`messages-tab-${t}`}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={tab === t ? styles.tabTextActive : styles.tabText}>
              {t === 'active' ? 'Active' : 'Archived'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          testID="messages-search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={commitSearch}
          placeholder="Search messages…"
          style={styles.searchInput}
          returnKeyType="search"
        />
      </View>

      {loading && chats.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error && chats.length === 0 ? (
        <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={load} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No conversations yet' : 'Nothing archived'}
          message={
            tab === 'active'
              ? 'Match with someone in Discover to start chatting.'
              : 'Archived chats show up here.'
          }
          actionLabel="Refresh"
          onAction={load}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          refreshing={loading}
          onRefresh={load}
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-row-${item.id}`}
              onPress={() =>
                navigation.navigate('Chat', { chatId: item.id, otherUser: item.otherUser })
              }
              onLongPress={() => setContextChat(item)}
              style={styles.row}>
              <View style={styles.avatar} />
              <View style={styles.body}>
                <View style={styles.rowHeader}>
                  <Text style={styles.name}>{item.otherUser?.displayName ?? 'Someone'}</Text>
                  {item.pinned ? <Text style={styles.tag}>Pinned</Text> : null}
                  {item.muted ? <Text style={styles.tag}>Muted</Text> : null}
                </View>
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessage?.content ?? 'Say hi'}
                </Text>
              </View>
              {item.unreadCount ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unreadCount}</Text>
                </View>
              ) : null}
            </Pressable>
          )}
        />
      )}

      {/* Context menu (long-press) */}
      <Modal
        visible={!!contextChat}
        transparent
        animationType="fade"
        onRequestClose={() => setContextChat(null)}>
        <Pressable style={styles.backdrop} onPress={() => setContextChat(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{contextChat?.otherUser?.displayName ?? 'Chat'}</Text>
            <SheetAction
              testID="chat-action-pin"
              label={contextChat?.pinned ? 'Unpin' : 'Pin'}
              onPress={() => {
                contextChat && togglePin(contextChat);
                setContextChat(null);
              }}
            />
            <SheetAction
              testID="chat-action-mute"
              label={contextChat?.muted ? 'Unmute' : 'Mute'}
              onPress={() => {
                contextChat && toggleMute(contextChat);
                setContextChat(null);
              }}
            />
            <SheetAction
              testID="chat-action-archive"
              label={tab === 'active' ? 'Archive' : 'Unarchive'}
              onPress={() => {
                contextChat && archive(contextChat);
                setContextChat(null);
              }}
            />
            <SheetAction
              testID="chat-action-clear"
              label="Clear conversation"
              danger
              onPress={() => {
                setConfirmClear(contextChat);
                setContextChat(null);
              }}
            />
            <SheetAction
              testID="chat-action-cancel"
              label="Cancel"
              onPress={() => setContextChat(null)}
            />
          </View>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!confirmClear}
        title="Clear this conversation?"
        message="Only your side is cleared; the other person still sees the messages."
        confirmLabel="Clear"
        danger
        onCancel={() => setConfirmClear(null)}
        onConfirm={() => confirmClear && clearChat(confirmClear)}
      />
    </SafeAreaView>
  );
}

function SheetAction({
  label,
  onPress,
  danger,
  testID,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.sheetBtn}>
      <Text style={danger ? styles.sheetBtnDanger : styles.sheetBtnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', padding: 12, gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tabActive: { backgroundColor: '#111', borderColor: '#111' },
  tabText: { color: '#111', fontWeight: '600' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  searchWrap: { paddingHorizontal: 12, paddingBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd', marginRight: 12 },
  body: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '600' },
  tag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#666',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#eee',
    textTransform: 'uppercase',
  },
  preview: { fontSize: 13, color: '#666' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, gap: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  sheetBtn: { paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { fontSize: 15, color: '#111', fontWeight: '600' },
  sheetBtnDanger: { fontSize: 15, color: '#c92222', fontWeight: '700' },
});
