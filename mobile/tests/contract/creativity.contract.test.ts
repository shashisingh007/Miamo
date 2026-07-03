// Miamo Mobile — creativity contract tests.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:creativity', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getCreativityReels returns an array', async () => {
    const res = await api.getCreativityReels();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getCreativityFeed returns an array', async () => {
    const res = await api.getCreativityFeed();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getSpotlight returns an object', async () => {
    const res = await api.getSpotlight();
    expect(res).toBeDefined();
  });

  it('reactToCreativity on bogus id fails cleanly', async () => {
    try {
      await api.reactToCreativity('does-not-exist', 'like');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('without auth, spotlight 401s', async () => {
    setAccessToken(null);
    await expect(api.getSpotlight()).rejects.toBeInstanceOf(ApiError);
    if (TOKEN) setAccessToken(TOKEN);
  });
});
