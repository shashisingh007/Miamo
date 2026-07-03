// Miamo Mobile — API client unit tests.
// Mocks global.fetch and asserts that every method group hits the right URL
// with the right verb + body. Doesn't hit the real backend — that's the
// contract-test layer under tests/contract/.
import { api, ApiError, setAccessToken, setNetworkAlertsEnabled } from '@lib/api';

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_URL = process.env.MIAMO_API_URL;

function mockOk(body: any) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as any);
}

function mockFail(status: number, msg = 'boom', code = 'ERR') {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message: msg, code } }),
  } as any);
}

beforeEach(() => {
  setNetworkAlertsEnabled(false);
  (global as any).fetch = jest.fn();
});

afterAll(() => {
  (global as any).fetch = ORIGINAL_FETCH;
  process.env.MIAMO_API_URL = ORIGINAL_URL;
});

describe('api — auth surface', () => {
  it('login POSTs credentials', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { accessToken: 't' } }));
    const res = await api.login({ email: 'a@b.c', password: 'pw' });
    expect(res.data.accessToken).toBe('t');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('otpStart POSTs identifier', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { otpToken: 'x' } }));
    const res = await api.otpStart('+919999999999');
    expect(res.data.otpToken).toBe('x');
  });

  it('otpVerify POSTs code', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { accessToken: 't' } }));
    await api.otpVerify({ otpToken: 'x', code: '123456' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/otp/verify'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getMe GETs /auth/me', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { id: 'u1' } }));
    await api.getMe();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/auth/me'),
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it('logout clears local token before request', async () => {
    setAccessToken('token');
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.logout();
    expect(global.fetch).toHaveBeenCalled();
  });

  it('rejects with ApiError on 400', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockFail(400, 'bad', 'VALIDATION'));
    await expect(api.otpStart('bad')).rejects.toBeInstanceOf(ApiError);
  });

  it('surfaces ApiError message + code + statusCode', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockFail(422, 'invalid', 'BAD'));
    try {
      await api.otpStart('bad');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.statusCode).toBe(422);
      expect(e.code).toBe('BAD');
      expect(e.message).toBe('invalid');
    }
  });
});

describe('api — discover surface', () => {
  it('getDiscover accepts filter params', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getDiscover({ minAge: '21' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('minAge=21'),
      expect.any(Object),
    );
  });

  it('sendLike POSTs toUserId', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { isMutual: false } }));
    await api.sendLike('u2');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/discover/like'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('u2') }),
    );
  });

  it('passUser POSTs the userId', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.passUser('u3');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/discover/pass'),
      expect.any(Object),
    );
  });

  it('getWeeklyTop returns null on 404', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockFail(404, 'not found'));
    const res = await api.getWeeklyTop();
    expect(res).toBeNull();
  });
});

describe('api — matches + messages surfaces', () => {
  it('getMatches GETs /matches', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getMatches();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/matches'),
      expect.any(Object),
    );
  });

  it('getChats GETs the chat list', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getChats();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/messages/chats'),
      expect.any(Object),
    );
  });

  it('sendMessage POSTs content', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { id: 'm1' } }));
    await api.sendMessage('c1', 'hey');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/messages/chats/c1/messages'),
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('hey') }),
    );
  });
});

describe('api — creativity + feed + notifications', () => {
  it('getCreativityReels GETs reels endpoint', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getCreativityReels();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/creativity/reels'),
      expect.any(Object),
    );
  });

  it('reactToCreativity POSTs a type', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.reactToCreativity('i1', 'like');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/creativity/items/i1/react'),
      expect.objectContaining({ body: expect.stringContaining('like') }),
    );
  });

  it('getFeed GETs feed', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getFeed();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/feed'),
      expect.any(Object),
    );
  });

  it('getNotifications supports unreadOnly filter', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.getNotifications(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('unreadOnly=true'),
      expect.any(Object),
    );
  });

  it('markNotificationRead POSTs to /read', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.markNotificationRead('n1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/n1/read'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('registerDevice POSTs platform + token', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.registerDevice({ platform: 'ios', token: 'ExponentPushToken[abc]' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications/register-device'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('ExponentPushToken[abc]'),
      }),
    );
  });
});

describe('api — settings, safety, dtm', () => {
  it('getSettings GETs /settings', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: {} }));
    await api.getSettings();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/settings'),
      expect.any(Object),
    );
  });

  it('updateSettings PUTs the patch', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: {} }));
    await api.updateSettings({ pushNotifications: true } as any);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/settings'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('reportUser POSTs reason', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: { ok: true } }));
    await api.reportUser({ reportedId: 'u9', reason: 'harassment' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/safety/report'),
      expect.objectContaining({ body: expect.stringContaining('harassment') }),
    );
  });

  it('browseMatrimonial encodes params', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: [] }));
    await api.browseMatrimonial({ minAge: 25 });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('minAge=25'),
      expect.any(Object),
    );
  });

  it('generateFamilyBrief POSTs format', async () => {
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ token: 't', url: 'u', expiresAt: 'x' }));
    const res = await api.generateFamilyBrief({ format: 'pdf' });
    expect(res.token).toBe('t');
  });
});

describe('api — network + token behaviour', () => {
  it('network error surfaces NETWORK_ERROR code', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));
    try {
      await api.getMe();
      throw new Error('should have thrown');
    } catch (err) {
      const e = err as ApiError;
      expect(e).toBeInstanceOf(ApiError);
      expect(e.code).toBe('NETWORK_ERROR');
    }
  });

  it('sets Authorization header when a token is present', async () => {
    setAccessToken('bearer-abc');
    (global.fetch as jest.Mock).mockReturnValue(mockOk({ data: {} }));
    await api.getMe();
    const callArgs = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe('Bearer bearer-abc');
    setAccessToken(null);
  });
});
