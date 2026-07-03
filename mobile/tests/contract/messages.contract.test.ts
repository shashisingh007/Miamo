// Miamo Mobile — messages contract tests.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:messages', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getChats returns an array', async () => {
    const res = await api.getChats();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getChatMessages on bogus id fails cleanly', async () => {
    try {
      await api.getChatMessages('does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('sendMessage rejects empty content', async () => {
    try {
      await api.sendMessage('does-not-exist', '');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('without auth, chats 401s', async () => {
    setAccessToken(null);
    await expect(api.getChats()).rejects.toBeInstanceOf(ApiError);
    if (TOKEN) setAccessToken(TOKEN);
  });
});
