// Miamo Mobile — Detox e2e: settings.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: settings', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('opens settings via the profile tab', async () => {
    await element(by.text('Profile')).tap();
    await element(by.id('profile-settings')).tap();
    await dExpect(element(by.id('settings-screen'))).toBeVisible();
  });

  it('exposes the push toggle', async () => {
    await dExpect(element(by.id('settings-push'))).toBeVisible();
  });
});
