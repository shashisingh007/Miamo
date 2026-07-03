// Miamo Mobile — Detox e2e: match list.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: matches', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('renders the matches tab', async () => {
    await element(by.text('Matches')).tap();
    await dExpect(element(by.id('matches-screen'))).toBeVisible();
  });
});
