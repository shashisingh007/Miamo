// Miamo Mobile — MessagesScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getChats: jest.fn().mockResolvedValue({
      data: [{ id: 'c1', otherUser: { displayName: 'Alice' }, lastMessage: { content: 'hi' }, unreadCount: 0 }],
    }),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MessagesScreen from '@screens/MessagesScreen';

describe('MessagesScreen', () => {
  it('renders chats once loaded', async () => {
    const { findByTestId } = render(<MessagesScreen />);
    await waitFor(() => expect(findByTestId('chat-row-c1')).toBeTruthy());
  });

  it('shows empty state when no chats', async () => {
    const api = require('@lib/api').api;
    api.getChats.mockResolvedValueOnce({ data: [] });
    const { findByTestId } = render(<MessagesScreen />);
    await waitFor(() => expect(findByTestId('empty-state')).toBeTruthy());
  });
});
