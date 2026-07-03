// Miamo Mobile — AiMatchScreen component test.
jest.mock('@lib/api', () => ({
  api: {
    getAiSuggestions: jest.fn().mockResolvedValue({
      data: [{ id: 'u1', displayName: 'Alice', score: 0.87 }],
    }),
    getWhyThisMatch: jest.fn().mockResolvedValue({ data: { reasons: ['same city'] } }),
    trackActivity: jest.fn(),
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AiMatchScreen from '@screens/AiMatchScreen';

describe('AiMatchScreen', () => {
  it('renders suggestions', async () => {
    const { findByTestId } = render(<AiMatchScreen />);
    await waitFor(() => expect(findByTestId('ai-match-row-u1')).toBeTruthy());
  });

  it('empty state when no suggestions', async () => {
    const api = require('@lib/api').api;
    api.getAiSuggestions.mockResolvedValueOnce({ data: [] });
    const { findByTestId } = render(<AiMatchScreen />);
    await waitFor(() => expect(findByTestId('empty-state')).toBeTruthy());
  });
});
