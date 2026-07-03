// Miamo Mobile — ProfileScreen smoke test.
// Deep interactions live in Detox (`tests/e2e/profile.e2e.ts`).
jest.mock('@lib/api', () => ({
  api: {
    getMyProfile: jest.fn().mockResolvedValue({ data: { age: 30, city: 'Bengaluru', bio: 'hi' } }),
    getTrustScore: jest.fn().mockResolvedValue({ data: { score: 0.8 } }),
    getCompletion: jest.fn().mockResolvedValue({ data: { score: 80, threshold: 60, buckets: [], missing: [], dtm: false } }),
    getVerificationStatus: jest.fn().mockResolvedValue({ data: { status: 'unverified' } }),
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
import ProfileScreen from '@screens/ProfileScreen';

describe('ProfileScreen', () => {
  it('mounts without crashing', () => {
    const { toJSON } = render(<ProfileScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
