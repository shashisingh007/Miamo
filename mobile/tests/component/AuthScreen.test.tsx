// Miamo Mobile — AuthScreen smoke test.
// The expanded AuthScreen now has 9 flow modes with dozens of testIDs; deep
// UI assertions live in the E2E Detox specs (`tests/e2e/auth.e2e.ts`) which
// run against a real backend. Here we only assert the screen mounts without
// throwing, which is enough to catch import/prop/hook regressions.
jest.mock('@lib/api', () => ({
  api: {
    login: jest.fn().mockResolvedValue({ data: { user: {}, accessToken: 't' } }),
    otpStart: jest.fn().mockResolvedValue({ data: {} }),
    otpVerify: jest.fn().mockResolvedValue({ data: {} }),
    signupStart: jest.fn().mockResolvedValue({ data: {} }),
    signupVerify: jest.fn().mockResolvedValue({ data: {} }),
    signupComplete: jest.fn().mockResolvedValue({ data: {} }),
    loginGoogle: jest.fn(),
    loginApple: jest.fn(),
    sendEmailOtp: jest.fn(),
    verifyEmailOtp: jest.fn(),
    sendPhoneOtp: jest.fn(),
    verifyPhoneOtp: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    statusCode = 0;
    code = 'X';
  },
  setAccessToken: jest.fn(),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import AuthScreen from '@screens/AuthScreen';

describe('AuthScreen', () => {
  it('mounts without crashing', () => {
    const { toJSON } = render(<AuthScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
