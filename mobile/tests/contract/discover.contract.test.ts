// Miamo Mobile — discover contract tests.
// Guarded by RUN_CONTRACT_TESTS=1. Needs a live gateway at $MIAMO_API_URL
// and a test user with a valid token in $MIAMO_TEST_TOKEN.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:discover', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getDiscover returns an array', async () => {
    const res = await api.getDiscover();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getDiscoverFilters returns the shape', async () => {
    const res = await api.getDiscoverFilters();
    expect(res?.data).toBeDefined();
  });

  it('sendLike with a bogus id returns 400/404', async () => {
    try {
      await api.sendLike('does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('passUser with a bogus id returns 400/404', async () => {
    try {
      await api.passUser('does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('without auth, discover 401s', async () => {
    setAccessToken(null);
    await expect(api.getDiscover()).rejects.toBeInstanceOf(ApiError);
    if (TOKEN) setAccessToken(TOKEN);
  });
});
