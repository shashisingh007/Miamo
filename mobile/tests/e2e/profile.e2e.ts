// Miamo Mobile — Detox e2e: profile view + edit.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: profile', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('renders the profile tab', async () => {
    await element(by.text('Profile')).tap();
    await dExpect(element(by.id('profile-screen'))).toBeVisible();
  });

  it('navigates to edit', async () => {
    await element(by.id('profile-edit')).tap();
    await dExpect(element(by.id('profile-edit-screen'))).toBeVisible();
  });
});
