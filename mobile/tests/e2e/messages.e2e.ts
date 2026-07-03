// Miamo Mobile — Detox e2e: messages + chat.
import { device, element, by, expect as dExpect } from 'detox';

describe('e2e: messages', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('renders the messages tab', async () => {
    await element(by.text('Messages')).tap();
    await dExpect(element(by.id('messages-screen'))).toBeVisible();
  });

  it('opens a chat when a row is tapped', async () => {
    // Assumes a seeded chat with id `c1`.
    await element(by.id('chat-row-c1')).tap();
    await dExpect(element(by.id('chat-screen'))).toBeVisible();
    await dExpect(element(by.id('chat-input'))).toBeVisible();
  });
});
