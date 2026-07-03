// Miamo Mobile — DTM Chat.
// Web parity: services/web/src/app/(main)/dtm/chat/page.tsx.
//
// Renders the matrimonial channel — separate thread space from casual chat.
// Uses api.getDtmChats() for the list and api.getDtmChatMessages(userId) for a
// selected thread. Sends via api.sendDtmMessage(). Mirrors the classic
// ChatScreen layout but scoped to DTM.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@lib/api';
import EmptyState from '@components/EmptyState';
import { toast } from '@components/Toast';
import { useTrackPageView } from '@hooks/useTrackActivity';

export default function DtmChatScreen() {
  useTrackPageView('dtm-chat');
  const [chats, setChats] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setLoadingList(true);
    try {
      const res: any = await (api as any).getDtmChats?.();
      setChats(res?.data ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const openThread = useCallback(async (chat: any) => {
    setActiveUser(chat.otherUser ?? chat);
    setLoadingMsgs(true);
    try {
      const res: any = await (api as any).getDtmChatMessages?.(
        chat.otherUser?.id ?? chat.userId ?? chat.id,
      );
      setMessages(res?.data ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  const send = useCallback(async () => {
    if (!activeUser) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    try {
      await (api as any).sendDtmMessage?.(activeUser.id, text, 'text');
      setDraft('');
      // Optimistic append
      setMessages(prev => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          content: text,
          sender: { self: true },
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }, [activeUser, draft]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ─── Chat list view ────────────────────────────────────────
  if (!activeUser) {
    return (
      <SafeAreaView style={styles.wrap} testID="dtm-chat-screen">
        <Text style={styles.title}>DTM Chats</Text>
        {loadingList ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : error ? (
          <EmptyState
            title="Couldn't load chats"
            message={error}
            actionLabel="Retry"
            onAction={loadChats}
          />
        ) : chats.length === 0 ? (
          <EmptyState
            title="No DTM chats yet"
            message="Start with a mutual DTM match."
          />
        ) : (
          <FlatList
            data={chats}
            keyExtractor={(c: any) => c.id ?? c.userId}
            renderItem={({ item }) => (
              <Pressable
                testID={`dtm-chat-row-${item.id ?? item.userId}`}
                onPress={() => openThread(item)}
                style={styles.row}>
                <View style={styles.avatar} />
                <View style={styles.body}>
                  <Text style={styles.name}>
                    {item.otherUser?.displayName ?? item.displayName ?? 'Someone'}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage?.content ?? 'Say hello'}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ─── Thread view ───────────────────────────────────────────
  return (
    <SafeAreaView style={styles.wrap} testID="dtm-chat-thread">
      <View style={styles.threadHeader}>
        <Pressable testID="dtm-chat-back" onPress={() => setActiveUser(null)}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.threadName}>
          {activeUser.displayName ?? 'Chat'}
        </Text>
      </View>
      {loadingMsgs ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m: any) => m.id}
          contentContainerStyle={styles.messages}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.sender?.self ? styles.bubbleSelf : styles.bubbleOther,
              ]}
              testID={`dtm-msg-${item.id}`}>
              <Text
                style={
                  item.sender?.self ? styles.bubbleSelfText : styles.bubbleOtherText
                }>
                {item.content}
              </Text>
            </View>
          )}
        />
      )}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.composer}>
          <TextInput
            testID="dtm-chat-input"
            placeholder="Type a message…"
            placeholderTextColor="#888"
            value={draft}
            onChangeText={setDraft}
            style={styles.input}
            multiline
          />
          <Pressable
            testID="dtm-chat-send"
            onPress={send}
            disabled={sending || !draft.trim()}
            style={[
              styles.sendBtn,
              (sending || !draft.trim()) && styles.sendDisabled,
            ]}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    padding: 16,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111' },
  preview: { fontSize: 12, color: '#666', marginTop: 2 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  backText: { color: '#111', fontWeight: '600' },
  threadName: { fontSize: 16, fontWeight: '700', color: '#111' },
  messages: { padding: 16, gap: 8 },
  bubble: {
    padding: 10,
    borderRadius: 12,
    maxWidth: '80%',
  },
  bubbleSelf: { backgroundColor: '#111', alignSelf: 'flex-end' },
  bubbleSelfText: { color: '#fff' },
  bubbleOther: { backgroundColor: '#f2f2f2', alignSelf: 'flex-start' },
  bubbleOtherText: { color: '#111' },
  composer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    color: '#111',
  },
  sendBtn: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700' },
});
