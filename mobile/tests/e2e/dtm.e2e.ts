// Miamo Mobile — Detox e2e: DTM.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: dtm', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('renders the DTM tab', async () => {
    await element(by.text('DTM')).tap();
    await dExpect(element(by.id('dtm-screen'))).toBeVisible();
  });
});
