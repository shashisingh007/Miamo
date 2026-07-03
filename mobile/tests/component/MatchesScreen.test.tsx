// Miamo Mobile — MatchesScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getMatches: jest.fn().mockResolvedValue({ data: [{ id: 'm1', matchedUser: { displayName: 'Alice' } }] }),
    getIncomingLikes: jest.fn().mockResolvedValue({ data: [] }),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import MatchesScreen from '@screens/MatchesScreen';

describe('MatchesScreen', () => {
  it('renders matches once loaded', async () => {
    const { findByTestId } = render(<MatchesScreen />);
    await waitFor(() => expect(findByTestId('match-row-m1')).toBeTruthy());
  });

  it('renders empty state when no matches', async () => {
    const api = require('@lib/api').api;
    api.getMatches.mockResolvedValueOnce({ data: [] });
    api.getIncomingLikes.mockResolvedValueOnce({ data: [] });
    const { findByTestId } = render(<MatchesScreen />);
    await waitFor(() => expect(findByTestId('empty-state')).toBeTruthy());
  });
});
