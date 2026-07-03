// Miamo Mobile — Detox e2e: creativity reels.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: creativity', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('renders the creativity tab', async () => {
    await element(by.text('Creativity')).tap();
    await dExpect(element(by.id('creativity-screen'))).toBeVisible();
  });
});
