// Miamo Mobile — ChatScreen smoke test.
// The expanded ChatScreen (638 lines) has cursor-paginated messages, edit/
// reply/react/delete flows, Move v2 picker, AI suggestions, moderation
// debounce, and theme picker. Deep interactions are covered by Detox
// (`tests/e2e/messages.e2e.ts`) — here we only smoke that the screen mounts.
jest.mock('@lib/api', () => ({
  api: {
    getChatMessages: jest.fn().mockResolvedValue({ data: [] }),
    sendMessage: jest.fn(),
    editMessage: jest.fn(),
    deleteMessageForMe: jest.fn(),
    deleteMessageForAll: jest.fn(),
    reactToMessage: jest.fn(),
    getMoveV2Suggestions: jest.fn().mockResolvedValue({ suggestions: [] }),
    getChatSuggestionsV4: jest.fn().mockResolvedValue({ data: [] }),
    checkContent: jest.fn().mockResolvedValue({ data: { ok: true } }),
    getChatBackgrounds: jest.fn().mockResolvedValue({ data: [] }),
    setChatTheme: jest.fn(),
    setChatBackground: jest.fn(),
    trackActivity: jest.fn(),
    searchMessages: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode = 0;
    code = 'X';
  },
  setAccessToken: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { chatId: 'c1', otherUser: { displayName: 'Alice' } } }),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), setOptions: jest.fn() }),
  useFocusEffect: (cb: any) => {
    // no-op in tests
    void cb;
  },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import ChatScreen from '@screens/ChatScreen';

describe('ChatScreen', () => {
  it('mounts without crashing', () => {
    const { toJSON } = render(<ChatScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
