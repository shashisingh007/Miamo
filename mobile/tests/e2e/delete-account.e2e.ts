// Miamo Mobile — Detox e2e: account deletion flow.
// Exercises the last-resort settings → logout flow. Full delete is
// destructive so the spec only asserts the log-out path renders correctly.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: account lifecycle', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('reaches the logout button in Settings', async () => {
    await element(by.text('Profile')).tap();
    await element(by.id('profile-settings')).tap();
    await dExpect(element(by.id('settings-logout'))).toBeVisible();
  });

  it('logs the user out', async () => {
    await element(by.id('settings-logout')).tap();
    await dExpect(element(by.id('auth-identifier'))).toBeVisible();
  });
});
