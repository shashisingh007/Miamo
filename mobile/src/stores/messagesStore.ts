// Miamo Mobile — Messages store.
// Chat list + per-chat message caches. Draft persistence is per-chat and
// held in memory (no need to survive cold boot; on mobile we hard-quit less
// often than tab-close on the web).
import { create } from 'zustand';
import { api } from '@lib/api';

interface MessagesState {
  chats: any[];
  chatMessages: Record<string, any[]>;
  drafts: Record<string, string>;
  loading: boolean;
  error: string | null;
  refreshChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  send: (chatId: string, content: string) => Promise<void>;
  setDraft: (chatId: string, draft: string) => void;
  clearDraft: (chatId: string) => void;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  chats: [],
  chatMessages: {},
  drafts: {},
  loading: false,
  error: null,
  refreshChats: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.getChats();
      set({ chats: res?.data ?? [], loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
  loadMessages: async chatId => {
    try {
      const res = await api.getChatMessages(chatId);
      set(state => ({
        chatMessages: { ...state.chatMessages, [chatId]: res?.data ?? [] },
      }));
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
  send: async (chatId, content) => {
    const draft = content.trim();
    if (!draft) return;
    try {
      const res = await api.sendMessage(chatId, draft);
      const msg = res?.data;
      if (msg) {
        set(state => ({
          chatMessages: {
            ...state.chatMessages,
            [chatId]: [...(state.chatMessages[chatId] || []), msg],
          },
          drafts: { ...state.drafts, [chatId]: '' },
        }));
      }
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
  setDraft: (chatId, draft) =>
    set(state => ({ drafts: { ...state.drafts, [chatId]: draft } })),
  clearDraft: chatId =>
    set(state => {
      const { [chatId]: _, ...rest } = state.drafts;
      return { drafts: rest };
    }),
}));

// Helper for tests + Chat screen: current draft or empty.
export const draftFor = (chatId: string) =>
  useMessagesStore.getState().drafts[chatId] || '';
