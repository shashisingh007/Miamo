// Miamo Mobile — API client.
// Ported from services/web/src/lib/api.ts. Differences from the web version:
//   1. Token storage: AsyncStorage instead of localStorage. Access token is
//      still held in-memory (zustand), refresh token in AsyncStorage under
//      `miamo_refresh_token` since RN has no httpOnly-cookie equivalent.
//   2. No `window` / `document` guards — everywhere is client-side in RN.
//   3. Network failures surface a friendly Alert.
//   4. `credentials: 'include'` is dropped — we send the refresh token in the
//      request body instead of relying on cookies.
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from './env';
import type {
  ApiResponse,
  MiamoNotification,
  MiamoSettings,
  MiamoBookmark,
  MiamoSession,
  DiscoverFilters,
  SearchResult,
  MiamoProfile,
} from './types';

export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public data: unknown;
  constructor(message: string, statusCode: number, code?: string, data?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'UNKNOWN_ERROR';
    this.data = data;
  }
}

// In-memory access token, primed from AsyncStorage at bootstrap and updated
// by the auth store on login/refresh. We do NOT persist the access token
// (parity with web XSS-hardening posture) — only the refresh token.
let _accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  _accessToken = token;
}
export function getAccessTokenMemo(): string | null {
  return _accessToken;
}

const TOKEN_KEY = 'miamo_token';
const REFRESH_KEY = 'miamo_refresh_token';

// Silent alert-toggle. Tests set this to `false` to avoid Alert.alert calls
// polluting logs.
let _networkAlertsEnabled = true;
export function setNetworkAlertsEnabled(enabled: boolean) {
  _networkAlertsEnabled = enabled;
}

class ApiClient {
  private baseUrl: string;
  private refreshInFlight: Promise<string | null> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return _accessToken;
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  private async tryRefresh(): Promise<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;
    const legacyRt = await this.getRefreshToken();
    this.refreshInFlight = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(legacyRt ? { refreshToken: legacyRt } : {}),
        });
        if (!res.ok) return null;
        const json = await res.json();
        const accessToken = json?.data?.accessToken;
        const refreshToken = json?.data?.refreshToken;
        if (!accessToken) return null;
        _accessToken = accessToken;
        if (refreshToken) {
          try {
            await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
          } catch {}
        }
        return accessToken;
      } catch {
        return null;
      }
    })();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Network error' } }));
        const apiErr = new ApiError(
          err.error?.message || 'Request failed',
          res.status,
          err.error?.code,
          err.data,
        );
        const isAuthFlowPath =
          path.includes('/auth/login') ||
          path.includes('/auth/register') ||
          path.includes('/auth/refresh') ||
          path.includes('/auth/logout');
        if (res.status === 401 && !_retried && !isAuthFlowPath) {
          const newToken = await this.tryRefresh();
          if (newToken) return this.request<T>(path, options, true);
        }
        if (res.status === 401 || (res.status === 404 && path.includes('/auth/me'))) {
          _accessToken = null;
          try {
            await AsyncStorage.removeItem(TOKEN_KEY);
            await AsyncStorage.removeItem(REFRESH_KEY);
          } catch {}
        }
        throw apiErr;
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const msg = `Network error — ${(err as Error).message || 'is the API server running?'}`;
      if (_networkAlertsEnabled) {
        try {
          Alert.alert('Connection problem', msg);
        } catch {}
      }
      throw new ApiError(msg, 0, 'NETWORK_ERROR');
    }
  }

  // ─── Auth ────────────────────────────────────────
  async register(data: { email: string; password: string; displayName: string }) {
    return this.request<any>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async signupStart(data: { identifier: string }) {
    return this.request<any>('/api/v1/auth/signup/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async signupVerify(data: { signupToken: string; code: string }) {
    return this.request<any>('/api/v1/auth/signup/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async signupComplete(data: { verifiedToken: string; password: string; displayName: string }) {
    return this.request<any>('/api/v1/auth/signup/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async loginGoogle(idToken: string) {
    return this.request<any>('/api/v1/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }
  async loginApple(idToken: string, user?: { name?: { firstName?: string; lastName?: string }; email?: string }) {
    return this.request<any>('/api/v1/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ idToken, user }),
    });
  }
  async otpStart(identifier: string) {
    return this.request<any>('/api/v1/auth/otp/start', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  }
  async otpVerify(data: { otpToken: string; code: string }) {
    return this.request<any>('/api/v1/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async login(data: { email: string; password: string }) {
    return this.request<any>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async login2fa(data: { challengeToken: string; code: string }) {
    return this.request<any>('/api/v1/auth/login/2fa', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async sendEmailOtp() {
    return this.request<any>('/api/v1/auth/email/send-otp', { method: 'POST' });
  }
  async verifyEmailOtp(code: string) {
    return this.request<any>('/api/v1/auth/email/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }
  async sendPhoneOtp(phone: string) {
    return this.request<any>('/api/v1/auth/phone/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }
  async verifyPhoneOtp(code: string) {
    return this.request<any>('/api/v1/auth/phone/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }
  async listTrustedDevices() {
    return this.request<any>('/api/v1/auth/devices');
  }
  async revokeTrustedDevice(id: string) {
    return this.request<any>(`/api/v1/auth/devices/${id}`, { method: 'DELETE' });
  }
  async logout() {
    _accessToken = null;
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_KEY);
    } catch {}
    return this.request<any>('/api/v1/auth/logout', { method: 'POST' });
  }
  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }
  async getCompletion() {
    return this.request<any>('/api/v1/profiles/me/completion');
  }
  async updatePassword(data: { currentPassword: string; newPassword: string }) {
    return this.request<any>('/api/v1/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async searchCities(q: string, limit = 12) {
    return this.request<any>(
      `/api/v1/cities/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
  }
  async nearestCity(lat: number, lng: number) {
    return this.request<any>(`/api/v1/cities/nearest?lat=${lat}&lng=${lng}`);
  }
  async submitVerification(data: { kind: 'selfie' | 'id_document' | 'video_liveness'; photoUrl: string }) {
    return this.request<any>('/api/v1/profiles/me/verify/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async getVerificationStatus() {
    return this.request<any>('/api/v1/profiles/me/verify/status');
  }

  // ─── Discover ────────────────────────────────────
  async getDiscover(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/discover${qs}`);
  }
  async getWeeklyTop() {
    try {
      return await this.request<any>('/api/v1/weekly-top');
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) return null;
      throw err;
    }
  }
  async sendLike(toUserId: string, targetType?: string, targetId?: string) {
    return this.request<any>('/api/v1/discover/like', {
      method: 'POST',
      body: JSON.stringify({ toUserId, targetType, targetId }),
    });
  }
  async sendComment(toUserId: string, message: string, type?: string, targetType?: string, targetId?: string) {
    return this.request<any>('/api/v1/discover/comment', {
      method: 'POST',
      body: JSON.stringify({ toUserId, message, type, targetType, targetId }),
    });
  }
  async passUser(userId: string) {
    return this.request<any>('/api/v1/discover/pass', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }
  async passUserFeedback(userId: string, reason: string, details?: string) {
    return this.request<any>('/api/v1/discover/pass-feedback', {
      method: 'POST',
      body: JSON.stringify({ userId, reason, details }),
    });
  }
  async superLikeUser(userId: string) {
    return this.request<any>(`/api/v1/discover/${userId}/superlike`, { method: 'POST' });
  }
  async sendMiamoMove(toUserId: string, message?: string, targetType?: string, targetId?: string) {
    return this.request<any>('/api/v1/discover/move', {
      method: 'POST',
      body: JSON.stringify({ toUserId, message, targetType, targetId }),
    });
  }
  async getMoveSuggestions(targetId: string) {
    return this.request<any>(`/api/v1/discover/move-suggestions/${targetId}`);
  }
  async getMoveV2Suggestions(itemId: string, opts?: { n?: number; seed?: number }) {
    return this.request<any>(`/api/v1/creativity/items/${itemId}/move-suggestions-v2`, {
      method: 'POST',
      body: JSON.stringify(opts ?? {}),
    });
  }
  async getMyVoiceFingerprint() {
    return this.request<any>('/api/v1/users/me/voice-fingerprint');
  }
  async getDiscoverWhy(targetId: string) {
    try {
      return await this.request<any>(`/api/v1/discover/${targetId}/why`);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) return null;
      throw err;
    }
  }
  async getDiscoverFilters() {
    return this.request<ApiResponse<DiscoverFilters>>('/api/v1/discover/filters');
  }
  async saveDiscoverFilters(filters: Partial<DiscoverFilters>) {
    return this.request<ApiResponse<DiscoverFilters>>('/api/v1/discover/filters', {
      method: 'PUT',
      body: JSON.stringify(filters),
    });
  }
  async getReceivedMoves() {
    return this.request<any>('/api/v1/discover/moves/received');
  }
  async acceptMove(id: string) {
    return this.request<any>(`/api/v1/discover/moves/${id}/accept`, { method: 'POST' });
  }
  async rejectMove(id: string) {
    return this.request<any>(`/api/v1/discover/moves/${id}/reject`, { method: 'POST' });
  }

  // ─── See-later pile ──────────────────────────────
  async deferItem(args: {
    surface: 'discover' | 'dtm';
    targetId: string;
    topic?: string;
    batchId?: string;
    reason?: 'not_now' | 'thinking' | 'unsure' | 'other';
  }) {
    return this.request<any>('/api/v1/defer', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }
  async listDeferred(args: {
    surface: 'discover' | 'dtm';
    kind?: 'pending' | 'resolved' | 'all';
    limit?: number;
  }) {
    const qs = new URLSearchParams({
      surface: args.surface,
      ...(args.kind ? { kind: args.kind } : {}),
      ...(args.limit ? { limit: String(args.limit) } : {}),
    }).toString();
    return this.request<any>(`/api/v1/defer?${qs}`);
  }
  async viewDeferred(id: string) {
    return this.request<any>(`/api/v1/defer/${id}/view`, { method: 'POST' });
  }
  async resolveDeferred(
    id: string,
    action: 'like' | 'pass' | 'super_like' | 'see_later' | 'answered' | 'skipped',
  ) {
    return this.request<any>(`/api/v1/defer/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // ─── Matches ─────────────────────────────────────
  async getMatches(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/matches${qs}`);
  }
  async getIncomingLikes(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/matches/incoming${qs}`);
  }
  async matchBack(userId: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/match-back`, { method: 'POST' });
  }
  async matchBackWithMove(userId: string, message: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/match-move`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  async holdIncoming(userId: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/hold`, { method: 'POST' });
  }
  async resumeIncoming(userId: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/resume`, { method: 'POST' });
  }
  async hideIncoming(userId: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/hide`, { method: 'POST' });
  }
  async getMatchSuggestions(userId: string) {
    return this.request<any>(`/api/v1/matches/incoming/${userId}/suggestions`);
  }
  async getMatchRequests() {
    return this.request<any>('/api/v1/matches/requests');
  }
  async getSentRequests() {
    return this.request<any>('/api/v1/matches/requests/sent');
  }
  async acceptRequest(id: string) {
    return this.request<any>(`/api/v1/matches/requests/${id}/accept`, { method: 'POST' });
  }
  async rejectRequest(id: string) {
    return this.request<any>(`/api/v1/matches/requests/${id}/reject`, { method: 'POST' });
  }
  async unmatch(id: string, reason?: string, details?: string) {
    return this.request<any>(`/api/v1/matches/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, details }),
    });
  }
  async unmatchByUser(userId: string, reason?: string, details?: string) {
    return this.request<any>(`/api/v1/matches/by-user/${userId}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, details }),
    });
  }
  async reportByUser(userId: string, reason: string, details?: string) {
    return this.request<any>(`/api/v1/matches/by-user/${userId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }
  async blockByUser(userId: string, reason?: string, details?: string) {
    return this.request<any>(`/api/v1/matches/by-user/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }
  async favoriteMatch(id: string) {
    return this.request<any>(`/api/v1/matches/${id}/favorite`, { method: 'POST' });
  }
  async pinMatch(id: string) {
    return this.request<any>(`/api/v1/matches/${id}/pin`, { method: 'POST' });
  }
  async reportMatch(id: string, reason: string, details?: string) {
    return this.request<any>(`/api/v1/matches/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  }

  // ─── Messages ────────────────────────────────────
  async getChats() {
    return this.request<any>('/api/v1/messages/chats');
  }
  async getArchivedChats() {
    return this.request<any>('/api/v1/messages/chats/archived');
  }
  async getChatMessages(chatId: string, cursor?: string) {
    return this.request<any>(
      `/api/v1/messages/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ''}`,
    );
  }
  async sendMessage(chatId: string, content: string, type?: string, replyToId?: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, type, replyToId }),
    });
  }
  async openChatWith(userId: string) {
    return this.request<any>(`/api/v1/messages/chats/with/${userId}`, { method: 'POST' });
  }
  async editMessage(id: string, content: string) {
    return this.request<any>(`/api/v1/messages/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }
  async deleteMessageForMe(id: string) {
    return this.request<any>(`/api/v1/messages/messages/${id}/delete-for-me`, { method: 'POST' });
  }
  async deleteMessageForAll(id: string) {
    return this.request<any>(`/api/v1/messages/messages/${id}/delete-for-all`, { method: 'POST' });
  }
  async reactToMessage(id: string, emoji: string) {
    return this.request<any>(`/api/v1/messages/messages/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
  }
  async pinChat(chatId: string, pinned: boolean) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/pin`, {
      method: 'POST',
      body: JSON.stringify({ pinned }),
    });
  }
  async muteChat(chatId: string, muted: boolean) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ muted }),
    });
  }
  async archiveChat(chatId: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ archived: true }),
    });
  }
  async unarchiveChat(chatId: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/unarchive`, { method: 'POST' });
  }
  async setChatTheme(chatId: string, theme: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/theme`, {
      method: 'POST',
      body: JSON.stringify({ theme }),
    });
  }
  async clearChat(chatId: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/clear`, { method: 'DELETE' });
  }
  async searchMessages(chatId: string, q: string) {
    return this.request<any>(
      `/api/v1/messages/chats/${chatId}/search?q=${encodeURIComponent(q)}`,
    );
  }
  async getChatSuggestions(chatId: string, context?: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/suggestions`, {
      method: 'POST',
      body: JSON.stringify({ context }),
    });
  }
  async getChatSuggestionsV4(chatId: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/suggestions-v4`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }
  async checkContent(content: string) {
    return this.request<any>('/api/v1/messages/check-content', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
  async getChatBackgrounds() {
    return this.request<any>('/api/v1/messages/backgrounds');
  }
  async setChatBackground(chatId: string, background: string) {
    return this.request<any>(`/api/v1/messages/chats/${chatId}/theme`, {
      method: 'POST',
      body: JSON.stringify({ background }),
    });
  }

  // ─── Beats ───────────────────────────────────────
  async getBeats(state?: string) {
    return this.request<any>(`/api/v1/beats${state ? `?state=${state}` : ''}`);
  }
  async startBeat(matchedUserId: string) {
    return this.request<any>('/api/v1/beats/start', {
      method: 'POST',
      body: JSON.stringify({ matchedUserId }),
    });
  }
  async completeBeat(id: string, type?: string, content?: string) {
    return this.request<any>(`/api/v1/beats/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ type, content }),
    });
  }
  async missBeat(id: string) {
    return this.request<any>(`/api/v1/beats/${id}/miss`, { method: 'POST' });
  }
  async expireBeat(id: string) {
    return this.request<any>(`/api/v1/beats/${id}/expire`, { method: 'POST' });
  }
  async restoreBeat(id: string) {
    return this.request<any>(`/api/v1/beats/${id}/restore`, { method: 'POST' });
  }
  async archiveBeat(id: string) {
    return this.request<any>(`/api/v1/beats/${id}/archive`, { method: 'POST' });
  }
  async viewBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/view`, { method: 'POST' });
  }
  async replayBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/view?mode=replay`, {
      method: 'POST',
    });
  }
  async saveBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/save`, { method: 'POST' });
  }
  async unsaveBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/unsave`, { method: 'POST' });
  }
  async screenshotBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/screenshot`, { method: 'POST' });
  }
  async downloadBeatEvent(eventId: string) {
    return this.request<any>(`/api/v1/beats/events/${eventId}/download`, { method: 'POST' });
  }

  // ─── Feed ────────────────────────────────────────
  async getFeed(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/feed${qs}`);
  }
  async createPost(data: { type?: string; content: string; mediaUrl?: string; visibility?: string }) {
    return this.request<any>('/api/v1/feed', { method: 'POST', body: JSON.stringify(data) });
  }
  async deletePost(id: string) {
    return this.request<any>(`/api/v1/feed/${id}`, { method: 'DELETE' });
  }
  async editPost(id: string, data: { content: string }) {
    return this.request<any>(`/api/v1/feed/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async reactToPost(id: string, type?: string) {
    return this.request<any>(`/api/v1/feed/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }
  async commentOnPost(id: string, content: string) {
    return this.request<any>(`/api/v1/feed/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
  async getPostComments(id: string) {
    return this.request<any>(`/api/v1/feed/${id}/comments`);
  }

  // ─── Stories ─────────────────────────────────────
  async getStories() {
    return this.request<any>('/api/v1/stories');
  }
  async getMyStories() {
    return this.request<any>('/api/v1/stories/mine');
  }
  async createStory(data: any) {
    return this.request<any>('/api/v1/stories', { method: 'POST', body: JSON.stringify(data) });
  }
  async viewStory(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/view`, { method: 'POST' });
  }
  async likeStory(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/like`, { method: 'POST' });
  }
  async reactToStory(id: string, reaction: string) {
    return this.request<any>(`/api/v1/stories/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  }
  async getStoryComments(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/comments`);
  }
  async commentOnStory(id: string, content: string, parentId?: string) {
    return this.request<any>(`/api/v1/stories/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId }),
    });
  }
  async deleteStoryComment(storyId: string, commentId: string) {
    return this.request<any>(`/api/v1/stories/${storyId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }
  async postStoryToFeed(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/post-to-feed`, { method: 'POST' });
  }
  async deleteStory(id: string) {
    return this.request<any>(`/api/v1/stories/${id}`, { method: 'DELETE' });
  }
  async getStoryViewers(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/viewers`);
  }
  async getStoryLikes(id: string) {
    return this.request<any>(`/api/v1/stories/${id}/likes`);
  }

  // ─── Videos ──────────────────────────────────────
  async getVideos(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/videos${qs}`);
  }
  async createVideo(data: any) {
    return this.request<any>('/api/v1/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async reactToVideo(id: string, type?: string) {
    return this.request<any>(`/api/v1/videos/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }
  async commentOnVideo(id: string, content: string) {
    return this.request<any>(`/api/v1/videos/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
  async viewVideo(id: string) {
    return this.request<any>(`/api/v1/videos/${id}/view`, { method: 'POST' });
  }
  async getVideoComments(id: string) {
    return this.request<any>(`/api/v1/videos/${id}/comments`);
  }

  // ─── Creativity ──────────────────────────────────
  async getCreativityCategories() {
    return this.request<any>('/api/v1/creativity/categories');
  }
  async getCreativityFeed(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/creativity/feed${qs}`);
  }
  async getCreativityItems(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/creativity/items${qs}`);
  }
  async createCreativityItem(data: any) {
    return this.request<any>('/api/v1/creativity/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async deleteCreativityItem(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}`, { method: 'DELETE' });
  }
  async getCreativityReels(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/creativity/reels${qs}`);
  }
  async reactToCreativity(id: string, type?: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    });
  }
  async commentOnCreativity(id: string, content: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
  async getCreativityComments(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/comments`);
  }
  async viewCreativityItem(id: string, durationMs?: number) {
    return this.request<any>(`/api/v1/creativity/items/${id}/view`, {
      method: 'POST',
      body: JSON.stringify({ durationMs }),
    });
  }
  async hideCreativityItem(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/hide`, { method: 'POST' });
  }
  async dislikeCreativityItem(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/dislike`, { method: 'POST' });
  }
  async notInterestedCreativityItem(id: string, reason?: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/not-interested`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  async reportCreativityItem(id: string, reason?: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }
  async hideCreativityAuthor(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/hide-author`, { method: 'POST' });
  }
  async getCreativityMoveSuggestions(id: string, n?: number) {
    return this.request<any>(
      `/api/v1/creativity/items/${id}/move-suggestions${n ? `?n=${n}` : ''}`,
    );
  }
  async sendCreativityMove(id: string, message?: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  async shareCreativityItem(id: string, channel?: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/share`, {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  }
  async saveCreativityItem(id: string) {
    return this.request<any>(`/api/v1/creativity/items/${id}/save`, { method: 'POST' });
  }
  async getCreativityTrends(category?: string) {
    return this.request<any>(
      `/api/v1/creativity/trends${category ? `?category=${category}` : ''}`,
    );
  }
  async getSpotlight() {
    return this.request<any>('/api/v1/creativity/spotlight');
  }
  async getSpotlightEarnOpportunities() {
    return this.request<any>('/api/v1/creativity/spotlight/earn-opportunities');
  }
  async claimSpotlightStreak() {
    return this.request<any>('/api/v1/creativity/spotlight/claim-streak', { method: 'POST' });
  }
  async purchaseSpotlight(minutes: number) {
    return this.request<any>('/api/v1/creativity/spotlight/purchase', {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  }
  async getCreativityVault() {
    return this.request<any>('/api/v1/creativity/vault');
  }
  async getCreativityLiveTrending() {
    return this.request<any>('/api/v1/creativity/trending/live');
  }

  // ─── Search ──────────────────────────────────────
  async search(q: string, type?: string) {
    return this.request<ApiResponse<SearchResult[]>>(
      `/api/v1/search?q=${encodeURIComponent(q)}&type=${type || 'all'}`,
    );
  }

  // ─── AI Match ────────────────────────────────────
  async getAiSuggestions() {
    return this.request<any>('/api/v1/ai-match/suggestions');
  }
  async getAiScore(targetId: string) {
    return this.request<any>(`/api/v1/ai-match/score/${targetId}`);
  }
  async getWhyThisMatch(targetId: string) {
    return this.request<any>(`/api/v1/ai-match/why/${targetId}`);
  }

  // ─── Vibe Check ──────────────────────────────────
  async saveVibeCheck(data: { mood: string; energy: number; topics: string[]; intent: string }) {
    return this.request<any>('/api/v1/vibe-check', { method: 'POST', body: JSON.stringify(data) });
  }
  async getVibeHistory() {
    return this.request<any>('/api/v1/vibe-check');
  }
  async getLatestVibe() {
    return this.request<any>('/api/v1/vibe-check/latest');
  }
  async getVibeMatches() {
    return this.request<any>('/api/v1/vibe-check/matches');
  }

  // ─── Notifications ───────────────────────────────
  async getNotifications(unreadOnly?: boolean) {
    return this.request<ApiResponse<MiamoNotification[]>>(
      `/api/v1/notifications${unreadOnly ? '?unreadOnly=true' : ''}`,
    );
  }
  async getNotificationCount() {
    return this.request<ApiResponse<{ count: number }>>('/api/v1/notifications/count');
  }
  async markNotificationRead(id: string) {
    return this.request<any>(`/api/v1/notifications/${id}/read`, { method: 'POST' });
  }
  async markAllNotificationsRead() {
    return this.request<any>('/api/v1/notifications/read-all', { method: 'POST' });
  }
  // Mobile-specific: register APNS/FCM token so this device receives push.
  async registerDevice(payload: { platform: 'ios' | 'android'; token: string }) {
    return this.request<any>('/api/v1/notifications/register-device', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ─── Settings ────────────────────────────────────
  async getSettings() {
    return this.request<ApiResponse<MiamoSettings>>('/api/v1/settings');
  }
  async updateSettings(data: Partial<MiamoSettings>) {
    return this.request<ApiResponse<MiamoSettings>>('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async updatePrivacy(data: Record<string, boolean | string>) {
    return this.request<any>('/api/v1/settings/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async deactivateAccount() {
    return this.request<any>('/api/v1/settings/deactivate', { method: 'POST' });
  }
  async reactivateAccount() {
    return this.request<any>('/api/v1/settings/reactivate', { method: 'POST' });
  }
  async deleteAccount(payload: { confirm: 'DELETE'; confirmUsername?: string; reason?: string } = { confirm: 'DELETE' }) {
    return this.request<any>('/api/v1/settings/delete', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  }
  async exportData() {
    return this.request<any>('/api/v1/settings/export');
  }
  async getBlockList() {
    return this.request<any>('/api/v1/settings/blocks');
  }
  async getTrustScore() {
    return this.request<any>('/api/v1/profiles/me/trust');
  }
  async getIntentStatus() {
    return this.request<any>('/api/v1/settings/intent-status');
  }
  async setIntentOverride(override: string | null) {
    return this.request<any>('/api/v1/settings/intent-override', {
      method: 'PUT',
      body: JSON.stringify({ override }),
    });
  }

  // ─── Profiles ────────────────────────────────────
  async getMyProfile() {
    return this.request<ApiResponse<MiamoProfile>>('/api/v1/profiles/me');
  }
  async updateProfile(data: Partial<MiamoProfile>) {
    return this.request<ApiResponse<MiamoProfile>>('/api/v1/profiles/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async updatePrompts(prompts: Array<{ question: string; answer: string; position: number }>) {
    return this.request<any>('/api/v1/profiles/me/prompts', {
      method: 'PUT',
      body: JSON.stringify({ prompts }),
    });
  }
  async updateInterests(interests: string[]) {
    return this.request<any>('/api/v1/profiles/me/interests', {
      method: 'PUT',
      body: JSON.stringify({ interests }),
    });
  }
  // FormData upload. React Native sets multipart Content-Type + boundary
  // automatically; we MUST NOT force `application/json` (that would break
  // the boundary). We hand-roll the fetch here to bypass the JSON header
  // that `request<T>()` sets by default.
  async uploadPhoto(formData: FormData) {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/profiles/me/photos`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Upload failed' } }));
        throw new ApiError(err.error?.message || 'Upload failed', res.status, 'UPLOAD_ERROR');
      }
      return await res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        `Network error — ${(err as Error).message || 'is the API server running?'}`,
        0,
        'NETWORK_ERROR',
      );
    }
  }
  async deletePhoto(photoId: string) {
    return this.request<any>(`/api/v1/profiles/me/photos/${photoId}`, { method: 'DELETE' });
  }

  // ─── Safety ──────────────────────────────────────
  async reportUser(data: {
    reportedId?: string;
    reason: string;
    reasonId?: string;
    details?: string;
    targetType?: 'user' | 'message' | 'photo' | 'story' | 'post' | 'creativity';
    targetId?: string;
    evidence?: string;
  }) {
    return this.request<any>('/api/v1/safety/report', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async blockUser(blockedId: string) {
    return this.request<any>('/api/v1/safety/block', {
      method: 'POST',
      body: JSON.stringify({ blockedId }),
    });
  }
  async unblockUser(blockedId: string) {
    return this.request<any>('/api/v1/safety/unblock', {
      method: 'POST',
      body: JSON.stringify({ blockedId }),
    });
  }
  async getSafetyTips() {
    return this.request<any>('/api/v1/safety/tips');
  }

  // ─── Matrimonial (DTM) ───────────────────────────
  async getMatrimonialProfile() {
    return this.request<any>('/api/v1/matrimonial/profile');
  }
  async updateMatrimonialProfile(data: any) {
    return this.request<any>('/api/v1/matrimonial/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
  async browseMatrimonial(params?: Record<string, string | number | boolean>) {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return this.request<any>(`/api/v1/matrimonial/browse${qs}`);
  }
  async browseMatrimonialAdvanced(params?: Record<string, string | number | boolean>) {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return this.request<any>(`/api/v1/matrimonial/browse/advanced${qs}`);
  }
  async getMatrimonialUserProfile(userId: string) {
    return this.request<any>(`/api/v1/matrimonial/profile/${userId}`);
  }
  async getMatrimonialMatches() {
    return this.request<any>('/api/v1/matrimonial/matches');
  }
  async getMatrimonialTemplates() {
    return this.request<any>('/api/v1/matrimonial/templates');
  }
  async getMatrimonialNumerology() {
    return this.request<any>('/api/v1/matrimonial/numerology');
  }
  async getMatrimonialNumerologyCompat(userId: string) {
    return this.request<any>(`/api/v1/matrimonial/numerology/compatibility/${userId}`);
  }
  async uploadKundli(data: { kundliUrl?: string; kundliData?: any; nakshatra?: string }) {
    return this.request<any>('/api/v1/matrimonial/kundli', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
  async getDtmChats() {
    return this.request<any>('/api/v1/matrimonial/chat');
  }
  async getDtmChatMessages(userId: string) {
    return this.request<any>(`/api/v1/matrimonial/chat/${userId}`);
  }
  async sendDtmMessage(recipientId: string, message: string, type?: string) {
    return this.request<any>('/api/v1/matrimonial/chat/send', {
      method: 'POST',
      body: JSON.stringify({ recipientId, message, type }),
    });
  }
  async generateFamilyBrief(args: { format: 'pdf' | 'image' | 'text'; trackViews?: boolean }) {
    return this.request<{ token: string; url: string; expiresAt: string; note?: string }>(
      '/api/v1/dtm/family-brief/generate',
      {
        method: 'POST',
        body: JSON.stringify({ format: args.format, trackViews: !!args.trackViews }),
      },
    );
  }
  async getFamilyBriefShares() {
    return this.request<any>('/api/v1/dtm/family-brief/shares');
  }
  async dtmMutualInterest(targetUserId: string) {
    return this.request<any>('/api/v1/dtm/mutual-interest', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }
  async requestAccess(targetUserId: string, accessType: string, message?: string) {
    return this.request<any>('/api/v1/matrimonial/access/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, accessType, message }),
    });
  }
  async getIncomingAccessRequests() {
    return this.request<any>('/api/v1/matrimonial/access/incoming');
  }
  async getSentAccessRequests() {
    return this.request<any>('/api/v1/matrimonial/access/sent');
  }
  async handleAccessRequest(id: string, action: 'grant' | 'deny' | 'revoke') {
    return this.request<any>(`/api/v1/matrimonial/access/${id}/${action}`, { method: 'POST' });
  }
  async getMatrimonialCompatibility(userId: string) {
    return this.request<any>(`/api/v1/matrimonial/compatibility/${userId}`);
  }

  // ─── Bookmarks / Sessions / Health ───────────────
  async getBookmarks() {
    return this.request<ApiResponse<MiamoBookmark[]>>('/api/v1/bookmarks');
  }
  async createBookmark(targetId: string) {
    return this.request<ApiResponse<MiamoBookmark>>('/api/v1/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ targetId }),
    });
  }
  async deleteBookmark(id: string) {
    return this.request<any>(`/api/v1/bookmarks/${id}`, { method: 'DELETE' });
  }
  async getSessions() {
    return this.request<ApiResponse<MiamoSession[]>>('/api/v1/auth/sessions');
  }
  async revokeSession(id: string) {
    return this.request<any>(`/api/v1/auth/sessions/${id}/revoke`, { method: 'POST' });
  }
  async health() {
    return this.request<any>('/health');
  }
  async refreshToken() {
    return this.request<any>('/api/v1/auth/refresh', { method: 'POST' });
  }

  // ─── User Data (persisted state) ─────────────────
  async getUserData(type: string, limit?: number) {
    const qs = limit ? `?type=${type}&limit=${limit}` : `?type=${type}`;
    return this.request<any>(`/api/v1/user-data${qs}`);
  }
  async saveUserData(type: string, data: any) {
    return this.request<any>('/api/v1/user-data', {
      method: 'POST',
      body: JSON.stringify({ type, data }),
    });
  }
  async updateUserData(id: string, data: any) {
    return this.request<any>(`/api/v1/user-data/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }
  async deleteUserData(id: string) {
    return this.request<any>(`/api/v1/user-data/${id}`, { method: 'DELETE' });
  }
  async upsertUserData(type: string, data: any) {
    return this.request<any>(`/api/v1/user-data/upsert/${type}`, {
      method: 'PUT',
      body: JSON.stringify({ data }),
    });
  }

  // ─── Misc / Admin ────────────────────────────────
  async getUserById(id: string) {
    return this.request<any>(`/api/v1/users/${id}`);
  }
  async getActivityAnalysis() {
    return this.request<any>('/api/v1/activity/analysis');
  }
  async getMyReports() {
    return this.request<any>('/api/v1/safety/reports');
  }
  async getAdminFairnessGini() {
    return this.request<any>('/api/v1/admin/fairness-gini');
  }

  // ─── Activity Tracking ───────────────────────────
  trackActivity(
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>,
    durationMs?: number,
  ) {
    const body: Record<string, unknown> = { action, targetType };
    if (targetId) body.targetId = targetId;
    if (metadata) body.metadata = metadata;
    if (durationMs) body.durationMs = durationMs;
    this.request('/api/v1/activity/track', { method: 'POST', body: JSON.stringify(body) }).catch(
      () => {},
    );
  }
}

export const api = new ApiClient(API_URL);
