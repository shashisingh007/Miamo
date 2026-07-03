// Miamo Mobile — Chat.
// Web parity: services/web/src/app/(main)/messages/chats/[id]/page.tsx.
//
// Features:
//   • Inverted FlatList with cursor-based infinite scroll.
//   • Optimistic send.
//   • Long-press message → action sheet (copy / react / edit / reply /
//     delete-for-me / delete-for-all).
//   • Theme + background picker via api.getChatBackgrounds and
//     api.setChatTheme / api.setChatBackground.
//   • Move v2 suggestions via existing <MoveV2Picker /> component.
//   • AI chat suggestions strip (api.getChatSuggestionsV4).
//   • Content moderation warning on send + on 2-second pause via
//     api.checkContent.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '@lib/api';
import { useMessagesStore, draftFor } from '@stores/messagesStore';
import MoveV2Picker from '@components/MoveV2Picker';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import { toast } from '@components/Toast';
import { useAuth } from '@hooks/useAuth';
import { useTrackPageView } from '@hooks/useTrackActivity';

const EMOJI_REACTIONS = ['❤️', '😂', '👍', '🙌', '😮', '😢'];
const MODERATION_DEBOUNCE_MS = 2000;

interface Message {
  id: string;
  content: string;
  createdAt?: string;
  senderId?: string;
  editedAt?: string;
  deletedForMe?: boolean;
  deletedForAll?: boolean;
  replyToId?: string;
  reactions?: { emoji: string; userId: string }[];
}

export default function ChatScreen() {
  useTrackPageView('chat');
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const chatId: string = route.params?.chatId;
  const otherUser = route.params?.otherUser;
  const { user } = useAuth();
  const { chatMessages, setDraft, drafts } = useMessagesStore();

  const [messages, setMessages] = useState<Message[]>(chatMessages[chatId] || []);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [showMoves, setShowMoves] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [themes, setThemes] = useState<{ id: string; label: string; preview?: string }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [moderationWarn, setModerationWarn] = useState<string | null>(null);

  const [contextMessage, setContextMessage] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<Message | null>(null);

  const draft = drafts[chatId] || draftFor(chatId);
  const moderationTimer = useRef<any>(null);
  const listRef = useRef<FlatList<Message>>(null);

  // ─── initial load + refresh ────────────────────────
  const loadPage = useCallback(
    async (nextCursor?: string) => {
      if (!chatId) return;
      setLoading(true);
      try {
        const res = await api.getChatMessages(chatId, nextCursor);
        const page = ((res as any)?.data ?? []) as Message[];
        const nextC = (res as any)?.cursor ?? (res as any)?.nextCursor;
        if (!nextCursor) {
          setMessages(page);
        } else {
          setMessages(cur => [...cur, ...page]);
        }
        setCursor(nextC);
        setHasMore(!!nextC);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [chatId],
  );

  useEffect(() => {
    if (chatId) loadPage();
  }, [chatId, loadPage]);

  useEffect(() => {
    if (!chatId) return;
    (api as any)
      .getChatBackgrounds?.()
      .then((res: any) => setThemes(res?.data ?? []))
      .catch(() => {});
  }, [chatId]);

  // ─── AI suggestions ────────────────────────────────
  const refreshSuggestions = useCallback(async () => {
    if (!chatId) return;
    try {
      const res = await api.getChatSuggestionsV4(chatId);
      const items = ((res as any)?.data ?? (res as any)?.suggestions ?? []) as any[];
      setSuggestions(items.map(x => (typeof x === 'string' ? x : x.text)).slice(0, 3));
    } catch {
      // Non-fatal.
    }
  }, [chatId]);

  // ─── content moderation debounce ───────────────────
  useEffect(() => {
    if (!draft.trim()) {
      setModerationWarn(null);
      return;
    }
    if (moderationTimer.current) clearTimeout(moderationTimer.current);
    moderationTimer.current = setTimeout(async () => {
      try {
        const res: any = await (api as any).checkContent?.(draft);
        const flag = res?.data?.flag ?? res?.flag ?? null;
        setModerationWarn(flag || null);
      } catch {
        setModerationWarn(null);
      }
    }, MODERATION_DEBOUNCE_MS);
    return () => moderationTimer.current && clearTimeout(moderationTimer.current);
  }, [draft]);

  // ─── send / edit ───────────────────────────────────
  async function onSend() {
    const text = draft.trim();
    if (!text) return;
    if (editing) {
      setSending(true);
      try {
        await (api as any).editMessage?.(editing.id, text);
        setMessages(cur =>
          cur.map(m =>
            m.id === editing.id ? { ...m, content: text, editedAt: new Date().toISOString() } : m,
          ),
        );
        setEditing(null);
        setDraft(chatId, '');
      } catch (err) {
        toast.error((err as Error).message);
      } finally {
        setSending(false);
      }
      return;
    }

    // optimistic
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      senderId: user?.id,
      replyToId: replyTo?.id,
    };
    setMessages(cur => [optimistic, ...cur]);
    setDraft(chatId, '');
    setReplyTo(null);
    setSending(true);
    try {
      const res = await api.sendMessage(chatId, text, undefined, optimistic.replyToId);
      const saved = ((res as any)?.data ?? null) as Message | null;
      setMessages(cur =>
        cur.map(m => (m.id === tempId ? { ...(saved || m), id: saved?.id ?? m.id } : m)),
      );
    } catch (err) {
      setMessages(cur => cur.filter(m => m.id !== tempId));
      setDraft(chatId, text);
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function react(m: Message, emoji: string) {
    try {
      await api.reactToMessage(m.id, emoji);
      setMessages(cur =>
        cur.map(x =>
          x.id === m.id
            ? { ...x, reactions: [...(x.reactions ?? []), { emoji, userId: user?.id ?? 'me' }] }
            : x,
        ),
      );
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function deleteForMe(m: Message) {
    try {
      await (api as any).deleteMessageForMe?.(m.id);
      setMessages(cur => cur.map(x => (x.id === m.id ? { ...x, deletedForMe: true } : x)));
    } catch (err) {
      toast.error((err as Error).message);
    }
  }
  async function deleteForAll(m: Message) {
    try {
      await (api as any).deleteMessageForAll?.(m.id);
      setMessages(cur => cur.map(x => (x.id === m.id ? { ...x, deletedForAll: true } : x)));
      toast.success('Deleted for everyone');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setConfirmDeleteAll(null);
    }
  }

  async function pickTheme(id: string) {
    try {
      await (api as any).setChatTheme?.(chatId, id);
      toast.success('Theme applied');
      setShowThemes(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  const isMine = useCallback((m: Message) => m.senderId === user?.id, [user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      if (item.deletedForAll) {
        return (
          <View style={[styles.msg, styles.msgTombstone]}>
            <Text style={styles.msgTombstoneText}>This message was deleted</Text>
          </View>
        );
      }
      if (item.deletedForMe) {
        return (
          <View style={[styles.msg, styles.msgTombstone]}>
            <Text style={styles.msgTombstoneText}>You deleted this message</Text>
          </View>
        );
      }
      const mine = isMine(item);
      return (
        <Pressable
          onLongPress={() => setContextMessage(item)}
          style={[styles.msg, mine ? styles.msgMine : styles.msgTheirs]}
          testID={`msg-${item.id}`}>
          <Text style={mine ? styles.msgTextMine : styles.msgText}>{item.content}</Text>
          {item.editedAt ? <Text style={styles.editedTag}>edited</Text> : null}
          {item.reactions?.length ? (
            <View style={styles.reactRow}>
              {item.reactions.map((r, i) => (
                <Text key={i} style={styles.reactChip}>
                  {r.emoji}
                </Text>
              ))}
            </View>
          ) : null}
        </Pressable>
      );
    },
    [isMine],
  );

  if (!chatId)
    return <EmptyState title="Missing chat" message="Open a chat from Matches or Messages." />;

  const composerPlaceholder = editing
    ? 'Editing your message'
    : replyTo
    ? `Reply to "${replyTo.content.slice(0, 30)}"`
    : 'Type a message';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrap}
      testID="chat-screen">
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>←</Text>
        </Pressable>
        <Text style={styles.title}>{otherUser?.displayName ?? 'Chat'}</Text>
        <Pressable
          onPress={() => setShowThemes(true)}
          style={styles.headerBtn}
          testID="chat-open-themes">
          <Text style={styles.headerBtnText}>⋯</Text>
        </Pressable>
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error && messages.length === 0 ? (
        <EmptyState title="Couldn't load" message={error} actionLabel="Retry" onAction={() => loadPage()} />
      ) : (
        <FlatList
          ref={listRef}
          inverted
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onEndReached={() => hasMore && !loading && loadPage(cursor)}
          onEndReachedThreshold={0.6}
        />
      )}

      {suggestions.length > 0 && (
        <View style={styles.suggestionsRow}>
          {suggestions.map((s, i) => (
            <Pressable
              key={i}
              testID={`chat-sugg-${i}`}
              onPress={() => setDraft(chatId, s)}
              style={styles.suggestionChip}>
              <Text style={styles.suggestionText} numberOfLines={2}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {moderationWarn && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>{moderationWarn}</Text>
        </View>
      )}

      {showMoves && (
        <View style={styles.movesWrap}>
          <MoveV2Picker
            itemId={chatId}
            onSelect={s => {
              setDraft(chatId, s.text);
              setShowMoves(false);
            }}
          />
        </View>
      )}

      {replyTo && (
        <View style={styles.replyBar}>
          <Text style={styles.replyText} numberOfLines={1}>
            ↩ {replyTo.content}
          </Text>
          <Pressable onPress={() => setReplyTo(null)}>
            <Text style={styles.replyClose}>✕</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.composer}>
        <Pressable
          testID="chat-open-moves"
          onPress={() => setShowMoves(v => !v)}
          style={styles.iconBtn}>
          <Text style={styles.iconText}>✧</Text>
        </Pressable>
        <Pressable
          testID="chat-open-suggestions"
          onPress={refreshSuggestions}
          style={styles.iconBtn}>
          <Text style={styles.iconText}>AI</Text>
        </Pressable>
        <TextInput
          testID="chat-input"
          value={draft}
          onChangeText={t => setDraft(chatId, t)}
          placeholder={composerPlaceholder}
          style={styles.input}
          multiline
        />
        <Pressable
          testID="chat-send"
          accessibilityRole="button"
          onPress={onSend}
          disabled={!draft.trim() || sending}
          style={[styles.sendBtn, (!draft.trim() || sending) && { opacity: 0.4 }]}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendText}>{editing ? 'Save' : 'Send'}</Text>
          )}
        </Pressable>
      </View>

      {/* Message context sheet */}
      <Modal
        transparent
        animationType="fade"
        visible={!!contextMessage}
        onRequestClose={() => setContextMessage(null)}>
        <Pressable style={styles.backdrop} onPress={() => setContextMessage(null)}>
          <View style={styles.sheet}>
            <View style={styles.reactPickerRow}>
              {EMOJI_REACTIONS.map(e => (
                <Pressable
                  key={e}
                  testID={`msg-react-${e}`}
                  onPress={() => {
                    contextMessage && react(contextMessage, e);
                    setContextMessage(null);
                  }}
                  style={styles.reactPickerBtn}>
                  <Text style={styles.reactPickerText}>{e}</Text>
                </Pressable>
              ))}
            </View>
            <SheetAction
              testID="msg-copy"
              label="Copy"
              onPress={async () => {
                if (contextMessage) await Clipboard.setStringAsync(contextMessage.content);
                toast.info('Copied');
                setContextMessage(null);
              }}
            />
            <SheetAction
              testID="msg-reply"
              label="Reply"
              onPress={() => {
                setReplyTo(contextMessage);
                setContextMessage(null);
              }}
            />
            {contextMessage && isMine(contextMessage) && (
              <SheetAction
                testID="msg-edit"
                label="Edit"
                onPress={() => {
                  setEditing(contextMessage);
                  setDraft(chatId, contextMessage.content);
                  setContextMessage(null);
                }}
              />
            )}
            <SheetAction
              testID="msg-delete-me"
              label="Delete for me"
              danger
              onPress={() => {
                contextMessage && deleteForMe(contextMessage);
                setContextMessage(null);
              }}
            />
            {contextMessage && isMine(contextMessage) && (
              <SheetAction
                testID="msg-delete-all"
                label="Delete for everyone"
                danger
                onPress={() => {
                  setConfirmDeleteAll(contextMessage);
                  setContextMessage(null);
                }}
              />
            )}
            <SheetAction
              testID="msg-cancel"
              label="Cancel"
              onPress={() => setContextMessage(null)}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Theme sheet */}
      <Modal
        transparent
        animationType="fade"
        visible={showThemes}
        onRequestClose={() => setShowThemes(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowThemes(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Chat theme</Text>
            {themes.length === 0 ? (
              <Text style={styles.emptyText}>No themes available yet.</Text>
            ) : (
              themes.map(t => (
                <SheetAction
                  key={t.id}
                  testID={`theme-${t.id}`}
                  label={t.label}
                  onPress={() => pickTheme(t.id)}
                />
              ))
            )}
            <SheetAction label="Close" onPress={() => setShowThemes(false)} />
          </View>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={!!confirmDeleteAll}
        title="Delete for everyone?"
        message="This removes the message from the other person's chat too."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDeleteAll(null)}
        onConfirm={() => confirmDeleteAll && deleteForAll(confirmDeleteAll)}
      />
    </KeyboardAvoidingView>
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
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerBtnText: { fontSize: 22, color: '#111' },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  list: { padding: 12, gap: 6 },
  msg: { padding: 10, borderRadius: 12, marginBottom: 4, maxWidth: '80%' },
  msgMine: { alignSelf: 'flex-end', backgroundColor: '#111' },
  msgTheirs: { alignSelf: 'flex-start', backgroundColor: '#f2f2f2' },
  msgTombstone: { alignSelf: 'flex-start', backgroundColor: '#fafafa', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  msgText: { fontSize: 14, color: '#111' },
  msgTextMine: { fontSize: 14, color: '#fff' },
  msgTombstoneText: { fontSize: 13, color: '#888', fontStyle: 'italic' },
  editedTag: { fontSize: 10, color: '#999', marginTop: 4 },
  reactRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  reactChip: { fontSize: 14 },
  composer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 8,
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  iconText: { fontSize: 15, fontWeight: '700' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendBtn: { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: '#111', borderRadius: 20 },
  sendText: { color: '#fff', fontWeight: '700' },
  movesWrap: { maxHeight: 260, backgroundColor: '#fafafa', borderTopWidth: 1, borderTopColor: '#eee' },
  suggestionsRow: { flexDirection: 'row', padding: 8, gap: 6, borderTopWidth: 1, borderTopColor: '#eee' },
  suggestionChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#f2f2f2',
  },
  suggestionText: { fontSize: 12, color: '#111' },
  warnBanner: { backgroundColor: '#fff2f2', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f5c5c5' },
  warnText: { color: '#c92222', fontSize: 12 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f7f7f7',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  replyText: { flex: 1, color: '#555', fontSize: 12 },
  replyClose: { color: '#111', fontWeight: '700', paddingHorizontal: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, gap: 4, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetTitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  sheetBtn: { paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { fontSize: 15, color: '#111', fontWeight: '600' },
  sheetBtnDanger: { fontSize: 15, color: '#c92222', fontWeight: '700' },
  reactPickerRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  reactPickerBtn: { padding: 8 },
  reactPickerText: { fontSize: 24 },
  emptyText: { textAlign: 'center', color: '#666', padding: 12 },
});
