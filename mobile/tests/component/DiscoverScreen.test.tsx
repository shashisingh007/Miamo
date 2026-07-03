// Miamo Mobile — DiscoverScreen smoke test.
// The expanded DiscoverScreen (988 lines) has filters, deck-swiper, Move v2,
// WhyCard, defer, MatchSuccessModal, WeeklyTop10. Deep interactions covered
// by Detox (`tests/e2e/discover.e2e.ts`).
jest.mock('@lib/api', () => ({
  api: {
    getDiscover: jest.fn().mockResolvedValue({ data: [] }),
    getDiscoverFilters: jest.fn().mockResolvedValue({ data: {} }),
    saveDiscoverFilters: jest.fn(),
    sendLike: jest.fn(),
    passUser: jest.fn(),
    passUserFeedback: jest.fn(),
    superLikeUser: jest.fn(),
    sendMiamoMove: jest.fn(),
    getMoveV2Suggestions: jest.fn().mockResolvedValue({ suggestions: [] }),
    getDiscoverWhy: jest.fn().mockResolvedValue(null),
    getWeeklyTop: jest.fn().mockResolvedValue(null),
    deferItem: jest.fn(),
    listDeferred: jest.fn().mockResolvedValue({ data: { items: [], count: 0 } }),
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
import DiscoverScreen from '@screens/DiscoverScreen';

describe('DiscoverScreen', () => {
  it('mounts without crashing', () => {
    const { toJSON } = render(<DiscoverScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
