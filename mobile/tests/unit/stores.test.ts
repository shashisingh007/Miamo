// Miamo Mobile — zustand store tests.
// Every store's actions get at least one assertion. We mock the api module
// so store logic is exercised without hitting the network.
jest.mock('@lib/api', () => ({
  api: {
    getMatches: jest.fn(),
    getIncomingLikes: jest.fn(),
    getChats: jest.fn(),
    getChatMessages: jest.fn(),
    sendMessage: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import { api } from '@lib/api';
import { useAuthStore } from '@stores/authStore';
import { useDiscoverStore } from '@stores/discoverStore';
import { useMatchesStore } from '@stores/matchesStore';
import { useMessagesStore, draftFor } from '@stores/messagesStore';
import { useSettingsStore } from '@stores/settingsStore';

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.getState().clearAuth();
  useDiscoverStore.getState().reset();
  useMatchesStore.setState({ matches: [], incoming: [], requests: [], loading: false, error: null });
  useMessagesStore.setState({ chats: [], chatMessages: {}, drafts: {}, loading: false, error: null });
  useSettingsStore.getState().reset();
});

describe('authStore', () => {
  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('setAuth flips isAuthenticated + persists token', () => {
    useAuthStore.getState().setAuth({ id: 'u1' }, 'tok', 'ref');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().token).toBe('tok');
  });

  it('clearAuth resets state', () => {
    useAuthStore.getState().setAuth({ id: 'u1' }, 'tok');
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('updateUser merges patch', () => {
    useAuthStore.getState().setAuth({ id: 'u1', displayName: 'Old' }, 'tok');
    useAuthStore.getState().updateUser({ displayName: 'New' });
    expect(useAuthStore.getState().user.displayName).toBe('New');
  });
});

describe('discoverStore', () => {
  it('setCards resets index', () => {
    useDiscoverStore.getState().setCards([{ id: 'a' }, { id: 'b' }]);
    expect(useDiscoverStore.getState().cards).toHaveLength(2);
    expect(useDiscoverStore.getState().currentIndex).toBe(0);
  });

  it('nextProfile advances index', () => {
    useDiscoverStore.getState().setCards([{ id: 'a' }, { id: 'b' }]);
    useDiscoverStore.getState().nextProfile();
    expect(useDiscoverStore.getState().currentIndex).toBe(1);
  });

  it('setFilters merges partial patch', () => {
    useDiscoverStore.getState().setFilters({ verifiedOnly: true });
    expect(useDiscoverStore.getState().filters.verifiedOnly).toBe(true);
    expect(useDiscoverStore.getState().filters.distance).toBe(50);
  });
});

describe('matchesStore', () => {
  it('refresh calls api and hydrates', async () => {
    (api.getMatches as jest.Mock).mockResolvedValue({ data: [{ id: 'm1' }] });
    (api.getIncomingLikes as jest.Mock).mockResolvedValue({ data: [{ id: 'i1' }] });
    await useMatchesStore.getState().refresh();
    expect(useMatchesStore.getState().matches).toHaveLength(1);
    expect(useMatchesStore.getState().incoming).toHaveLength(1);
  });

  it('refresh surfaces error string', async () => {
    (api.getMatches as jest.Mock).mockRejectedValue(new Error('boom'));
    await useMatchesStore.getState().refresh();
    expect(useMatchesStore.getState().error).toBe('boom');
  });

  it('removeMatch drops by id', () => {
    useMatchesStore.setState({ matches: [{ id: 'a' }, { id: 'b' }], incoming: [], requests: [], loading: false, error: null });
    useMatchesStore.getState().removeMatch('a');
    expect(useMatchesStore.getState().matches).toHaveLength(1);
  });
});

describe('messagesStore', () => {
  it('refreshChats hydrates chat list', async () => {
    (api.getChats as jest.Mock).mockResolvedValue({ data: [{ id: 'c1' }] });
    await useMessagesStore.getState().refreshChats();
    expect(useMessagesStore.getState().chats).toHaveLength(1);
  });

  it('loadMessages populates chatMessages[chatId]', async () => {
    (api.getChatMessages as jest.Mock).mockResolvedValue({ data: [{ id: 'm1' }] });
    await useMessagesStore.getState().loadMessages('c1');
    expect(useMessagesStore.getState().chatMessages['c1']).toHaveLength(1);
  });

  it('send appends and clears draft', async () => {
    (api.sendMessage as jest.Mock).mockResolvedValue({ data: { id: 'm2', content: 'hi' } });
    useMessagesStore.getState().setDraft('c1', 'hi');
    await useMessagesStore.getState().send('c1', 'hi');
    expect(useMessagesStore.getState().chatMessages['c1']).toHaveLength(1);
    expect(draftFor('c1')).toBe('');
  });

  it('clearDraft removes the key', () => {
    useMessagesStore.getState().setDraft('c1', 'hi');
    useMessagesStore.getState().clearDraft('c1');
    expect(draftFor('c1')).toBe('');
  });
});

describe('settingsStore', () => {
  it('refresh hydrates', async () => {
    (api.getSettings as jest.Mock).mockResolvedValue({ data: { pushNotifications: true } });
    await useSettingsStore.getState().refresh();
    expect(useSettingsStore.getState().settings?.pushNotifications).toBe(true);
  });

  it('update optimistically patches + syncs', async () => {
    (api.updateSettings as jest.Mock).mockResolvedValue({ data: { pushNotifications: false } });
    useSettingsStore.setState({ settings: { pushNotifications: true }, loading: false, error: null });
    await useSettingsStore.getState().update({ pushNotifications: false });
    expect(useSettingsStore.getState().settings?.pushNotifications).toBe(false);
  });

  it('update reverts on failure', async () => {
    (api.updateSettings as jest.Mock).mockRejectedValue(new Error('nope'));
    useSettingsStore.setState({ settings: { pushNotifications: true }, loading: false, error: null });
    await useSettingsStore.getState().update({ pushNotifications: false });
    expect(useSettingsStore.getState().settings?.pushNotifications).toBe(true);
    expect(useSettingsStore.getState().error).toBe('nope');
  });
});
