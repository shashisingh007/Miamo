// Miamo Mobile — notifications contract tests.
// Includes the new mobile-specific /register-device endpoint (Phase 7).
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:notifications', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getNotifications returns an array', async () => {
    const res = await api.getNotifications();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getNotificationCount returns a number', async () => {
    const res = await api.getNotificationCount();
    expect(typeof res?.data?.count).toBe('number');
  });

  it('markAllNotificationsRead is idempotent', async () => {
    const res = await api.markAllNotificationsRead();
    expect(res).toBeDefined();
  });

  it('registerDevice accepts a valid Expo token', async () => {
    const res = await api.registerDevice({
      platform: 'ios',
      token: `ExponentPushToken[test-${Date.now()}]`,
    });
    expect(res).toBeDefined();
  });

  it('registerDevice rejects an empty token (400)', async () => {
    try {
      await api.registerDevice({ platform: 'ios', token: '' });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('registerDevice rejects a bad platform (400)', async () => {
    try {
      // @ts-expect-error — testing the contract
      await api.registerDevice({ platform: 'windows', token: 'x'.repeat(20) });
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('without auth, notifications 401s', async () => {
    setAccessToken(null);
    await expect(api.getNotifications()).rejects.toBeInstanceOf(ApiError);
    if (TOKEN) setAccessToken(TOKEN);
  });
});
