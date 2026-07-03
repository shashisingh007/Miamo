// Miamo Mobile — Detox e2e: discover.
// Assumes the app already has a signed-in test session (Detox lifecycle:
// launchApp with a seeded MIAMO_TEST_TOKEN in the AsyncStorage bootstrap).
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: discover', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES' },
    });
  });

  it('renders the discover screen', async () => {
    await dExpect(element(by.id('discover-screen'))).toBeVisible();
  });

  it('renders the swiper stack', async () => {
    await dExpect(element(by.id('swiper'))).toBeVisible();
  });
});
