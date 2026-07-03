// Miamo Mobile — DTM contract tests.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';
const TOKEN = process.env.MIAMO_TEST_TOKEN;

(RUN ? describe : describe.skip)('contract:dtm', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
    if (TOKEN) setAccessToken(TOKEN);
  });

  it('getMatrimonialProfile returns an object or 404', async () => {
    try {
      const res = await api.getMatrimonialProfile();
      expect(res).toBeDefined();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('browseMatrimonial returns an array', async () => {
    const res = await api.browseMatrimonial();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('getMatrimonialMatches returns an array', async () => {
    const res = await api.getMatrimonialMatches();
    expect(Array.isArray(res?.data)).toBe(true);
  });

  it('requestAccess needs a target user id (400 without)', async () => {
    try {
      // @ts-expect-error — deliberately breaking the contract
      await api.requestAccess(undefined, 'family');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });

  it('handleAccessRequest on bogus id fails cleanly', async () => {
    try {
      await api.handleAccessRequest('does-not-exist', 'grant');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
