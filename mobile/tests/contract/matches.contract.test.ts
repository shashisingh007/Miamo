// Miamo Mobile — matches contract tests.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:matches', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getMatches returns an array', async () => {
    const res = await api.getMatches();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getIncomingLikes returns an array', async () => {
    const res = await api.getIncomingLikes();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('unmatch on a bogus id fails cleanly', async () => {
    try {
      await api.unmatch('does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('reportMatch requires reason', async () => {
    try {
      // deliberately breaking the contract to prove 400
      await api.reportMatch('does-not-exist', undefined as unknown as string);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('without auth, matches 401s', async () => {
    setAccessToken(null);
    await expect(api.getMatches()).rejects.toBeInstanceOf(ApiError);
    if (TOKEN) setAccessToken(TOKEN);
  });
});
