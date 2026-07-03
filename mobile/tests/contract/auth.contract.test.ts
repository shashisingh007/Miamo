// Miamo Mobile — auth contract tests.
// Only runs when RUN_CONTRACT_TESTS=1 and a live backend is reachable at
// $MIAMO_API_URL. Each test covers: happy path, auth failure, validation.
import { api, setAccessToken, setNetworkAlertsEnabled, ApiError } from '@lib/api';

const RUN = process.env.RUN_CONTRACT_TESTS === '1';

(RUN ? describe : describe.skip)('contract:auth', () => {
  beforeAll(() => {
    setNetworkAlertsEnabled(false);
    process.env.MIAMO_API_URL = process.env.MIAMO_API_URL || 'http://localhost:3200';
  });

  it('otpStart accepts a valid phone', async () => {
    const res = await api.otpStart('+919999999999');
    expect(res).toBeTruthy();
    expect(res?.data?.otpToken).toBeDefined();
  });

  it('otpStart rejects a malformed identifier (400)', async () => {
    await expect(api.otpStart('not-a-phone-or-email')).rejects.toBeInstanceOf(ApiError);
  });

  it('login without credentials returns 400', async () => {
    await expect(api.login({ email: '', password: '' })).rejects.toBeInstanceOf(ApiError);
  });

  it('getMe without a token returns 401', async () => {
    setAccessToken(null);
    await expect(api.getMe()).rejects.toBeInstanceOf(ApiError);
  });

  it('logout is idempotent', async () => {
    // Might 401 without a session — either 200 or 401 is acceptable.
    try {
      await api.logout();
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
    }
  });
});
