// Miamo Mobile — Detox e2e: auth flow.
// Assumes the app is built + installed via `npm run e2e:build:ios|android`.
// The steps mirror what a first-time user does: launch → identifier → OTP.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: auth', () => {
  beforeAll(async () => {
    await device.launchApp({ delete: true, newInstance: true });
  });

  it('renders the identifier field on cold start', async () => {
    await dExpect(element(by.id('auth-identifier'))).toBeVisible();
  });

  it('sends OTP and advances to code stage', async () => {
    await element(by.id('auth-identifier')).typeText('+919999999999');
    await element(by.id('auth-otp-start')).tap();
    await dExpect(element(by.id('auth-otp-code'))).toBeVisible();
  });

  it('switches to password mode', async () => {
    await device.reloadReactNative();
    await element(by.id('auth-switch-to-password')).tap();
    await dExpect(element(by.id('auth-password-email'))).toBeVisible();
  });
});
