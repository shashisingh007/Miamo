// Miamo Mobile — CreativityScreen smoke test.
// The expanded CreativityScreen (1,086 lines) has Reels/Feed/Categories/
// Vault/Trending tabs, Spotlight, and 20 creativity actions. Deep flows
// covered by Detox (`tests/e2e/creativity.e2e.ts`).
jest.mock('@lib/api', () => ({
  api: {
    getCreativityReels: jest.fn().mockResolvedValue({ data: [] }),
    getCreativityFeed: jest.fn().mockResolvedValue({ data: [] }),
    getCreativityCategories: jest.fn().mockResolvedValue({ data: [] }),
    getCreativityVault: jest.fn().mockResolvedValue({ data: [] }),
    getCreativityLiveTrending: jest.fn().mockResolvedValue({ data: [] }),
    getSpotlight: jest.fn().mockResolvedValue({ data: null }),
    getSpotlightEarnOpportunities: jest.fn().mockResolvedValue({ data: [] }),
    reactToCreativity: jest.fn(),
    viewCreativityItem: jest.fn(),
    saveCreativityItem: jest.fn(),
    sendCreativityMove: jest.fn(),
    trackActivity: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode = 0;
    code = 'X';
  },
  setAccessToken: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }),
  useRoute: () => ({ params: {} }),
  useFocusEffect: (cb: any) => {
    void cb;
  },
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import CreativityScreen from '@screens/CreativityScreen';

describe('CreativityScreen', () => {
  it('mounts without crashing', () => {
    const { toJSON } = render(<CreativityScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
