// ─── Miamo API Client ────────────────────────────────
// Connects to real backend API
import type { ApiResponse, MiamoNotification, MiamoSettings, MiamoBookmark, MiamoSession, DiscoverFilters, SearchResult, MiamoProfile } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

/**
 * Structured API error thrown by the `ApiClient` on non-2xx responses or network failures.
 *
 * @property statusCode - HTTP status code (0 for network errors)
 * @property code - Machine-readable error code (e.g. 'UNAUTHORIZED', 'NETWORK_ERROR')
 * @property data - Optional additional error data from the server
 */
class ApiError extends Error {
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

/**
 * HTTP client for the Miamo backend API.
 *
 * Handles JWT authentication (reads from localStorage), automatic token
 * cleanup on 401 responses, and structured error handling.
 * All methods return typed API responses and throw `ApiError` on failure.
 *
 * Organized into sections: Auth, Discover, Matches, Messages, Beats,
 * Feed, Stories, Videos, Creativity, Search, AI Match, Vibe Check,
 * Notifications, Settings, Profiles, Safety, Matrimonial, and Activity.
 */
class ApiClient {
 private baseUrl: string;
 // Singleton in-flight refresh promise — coalesces parallel /auth/refresh
 // calls when many requests 401 simultaneously after a hard nav.
 private refreshInFlight: Promise<string | null> | null = null;
 /** @param baseUrl - Root URL of the API gateway (e.g. 'http://localhost:3200') */
 constructor(baseUrl: string) { this.baseUrl = baseUrl; }

 private getToken(): string | null {
 if (typeof window === 'undefined') return null;
 // Source of truth: in-memory Zustand store. We deliberately do NOT
 // persist the access token in localStorage (XSS hardening). On a fresh
 // page load the store has no token → first 401 triggers tryRefresh()
 // via the httpOnly refresh cookie and primes the in-memory token.
 try {
 const { useAuthStore } = require('@/stores');
 const t = useAuthStore.getState().token as string | null;
 if (t) return t;
 } catch {}
 // One-time migration fallback: if a legacy access token is still in
 // localStorage (pre-cookie deploy), use it once and clear it.
 const legacy = localStorage.getItem('miamo_token');
 if (legacy) {
 try { localStorage.removeItem('miamo_token'); } catch {}
 try {
 const { useAuthStore } = require('@/stores');
 useAuthStore.getState().setTokens(legacy, null);
 } catch {}
 return legacy;
 }
 return null;
 }

 private getRefreshToken(): string | null {
 if (typeof window === 'undefined') return null;
 // Refresh token now lives in an httpOnly cookie (sent automatically).
 // This getter only returns a legacy localStorage value used as a one-time
 // body fallback for users who logged in before the cookie deploy.
 return localStorage.getItem('miamo_refresh_token');
 }

 /**
  * Exchange a refresh token for a new access token. Bypasses the normal
  * `request()` pipeline so a 401 here doesn't recursively clear auth.
  * Refresh token is normally read from the httpOnly `miamo_rt` cookie
  * (XSS-safe) — sent automatically via `credentials: 'include'`. The body
  * is a fallback for legacy clients that still hold a token in localStorage.
  * Returns the new access token on success, or null on failure.
  */
 private async tryRefresh(): Promise<string | null> {
 if (this.refreshInFlight) return this.refreshInFlight;
 const legacyRt = this.getRefreshToken();
 this.refreshInFlight = (async () => {
 try {
 const res = await fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 credentials: 'include',
 body: JSON.stringify(legacyRt ? { refreshToken: legacyRt } : {}),
 });
 if (!res.ok) return null;
 const json = await res.json();
 const accessToken = json?.data?.accessToken;
 if (!accessToken) return null;
 if (typeof window !== 'undefined') {
 // Cookie now holds the refresh token; nuke any legacy copies.
 localStorage.removeItem('miamo_token');
 localStorage.removeItem('miamo_refresh_token');
 try {
 const { useAuthStore } = require('@/stores');
 useAuthStore.getState().setTokens(accessToken, null);
 } catch {}
 }
 return accessToken;
 } catch { return null; }
 })();
 try { return await this.refreshInFlight; }
 finally { this.refreshInFlight = null; }
 }

 private async request<T>(path: string, options: RequestInit = {}, _retried = false): Promise<T> {
 const token = this.getToken();
 const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
 if (token) headers['Authorization'] = `Bearer ${token}`;
 try {
 const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers, credentials: 'include' });
 if (!res.ok) {
 const err = await res.json().catch(() => ({ error: { message: 'Network error' } }));
 const apiErr = new ApiError(err.error?.message || 'Request failed', res.status, err.error?.code, err.data);
 // 401 → try refreshing once before giving up. Skip auth-flow paths.
 const isAuthFlowPath = path.includes('/auth/login') || path.includes('/auth/register') || path.includes('/auth/refresh') || path.includes('/auth/logout');
 if (typeof window !== 'undefined' && res.status === 401 && !_retried && !isAuthFlowPath) {
 const newToken = await this.tryRefresh();
 if (newToken) return this.request<T>(path, options, true);
 }
 // On 401 (after refresh attempt) or stale /auth/me, clear auth.
 if (typeof window !== 'undefined' && (res.status === 401 || (res.status === 404 && path.includes('/auth/me')))) {
 localStorage.removeItem('miamo_token');
 localStorage.removeItem('miamo_refresh_token');
 try { localStorage.removeItem('miamo-auth'); } catch {}
 // Clear Zustand auth store to sync isAuthenticated state
 try {
 const { useAuthStore } = require('@/stores');
 useAuthStore.getState().clearAuth();
 } catch {}
 }
 // v3.2 — Onboarding gate: redirect to /onboarding on any 403 ONBOARDING_INCOMPLETE.
 if (typeof window !== 'undefined' && res.status === 403 && err.error?.code === 'ONBOARDING_INCOMPLETE') {
 if (!window.location.pathname.startsWith('/onboarding')) {
 window.location.href = '/onboarding';
 }
 }
 throw apiErr;
 }
 return res.json();
 } catch (err) {
 if (err instanceof ApiError) throw err;
 throw new ApiError(`Network error — ${(err as Error).message || 'is the API server running?'}`, 0, 'NETWORK_ERROR');
 }
 }

 // Auth
 async register(data: { email: string; password: string; displayName: string }) {
 return this.request<any>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) });
 }
 async signupStart(data: { identifier: string }) {
 return this.request<any>('/api/v1/auth/signup/start', { method: 'POST', body: JSON.stringify(data) });
 }
 async signupVerify(data: { signupToken: string; code: string }) {
 return this.request<any>('/api/v1/auth/signup/verify', { method: 'POST', body: JSON.stringify(data) });
 }
 async signupComplete(data: { verifiedToken: string; password: string; displayName: string }) {
 return this.request<any>('/api/v1/auth/signup/complete', { method: 'POST', body: JSON.stringify(data) });
 }
 async loginGoogle(idToken: string) {
 return this.request<any>('/api/v1/auth/google', { method: 'POST', body: JSON.stringify({ idToken }) });
 }
 async loginApple(idToken: string, user?: { name?: { firstName?: string; lastName?: string }; email?: string }) {
 return this.request<any>('/api/v1/auth/apple', { method: 'POST', body: JSON.stringify({ idToken, user }) });
 }
 async otpStart(identifier: string) {
 return this.request<any>('/api/v1/auth/otp/start', { method: 'POST', body: JSON.stringify({ identifier }) });
 }
 async otpVerify(data: { otpToken: string; code: string }) {
 return this.request<any>('/api/v1/auth/otp/verify', { method: 'POST', body: JSON.stringify(data) });
 }
 async login(data: { email: string; password: string }) {
 return this.request<any>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) });
 }
 async login2fa(data: { challengeToken: string; code: string }) {
 return this.request<any>('/api/v1/auth/login/2fa', { method: 'POST', body: JSON.stringify(data) });
 }
 async sendEmailOtp() {
 return this.request<any>('/api/v1/auth/email/send-otp', { method: 'POST' });
 }
 async verifyEmailOtp(code: string) {
 return this.request<any>('/api/v1/auth/email/verify-otp', { method: 'POST', body: JSON.stringify({ code }) });
 }
 async sendPhoneOtp(phone: string) {
 return this.request<any>('/api/v1/auth/phone/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
 }
 async verifyPhoneOtp(code: string) {
 return this.request<any>('/api/v1/auth/phone/verify-otp', { method: 'POST', body: JSON.stringify({ code }) });
 }
 async listTrustedDevices() {
 return this.request<any>('/api/v1/auth/devices');
 }
 async revokeTrustedDevice(id: string) {
 return this.request<any>(`/api/v1/auth/devices/${id}`, { method: 'DELETE' });
 }
 async searchCities(q: string, limit = 12) {
 return this.request<{ data: Array<{ name: string; region: string; country: string; display: string; lat: number; lng: number; population: number }> }>(`/api/v1/cities/search?q=${encodeURIComponent(q)}&limit=${limit}`);
 }
 async nearestCity(lat: number, lng: number) {
 return this.request<{ data: { name: string; region: string; country: string; display: string; lat: number; lng: number; population: number } }>(`/api/v1/cities/nearest?lat=${lat}&lng=${lng}`);
 }
 async submitVerification(data: { kind: 'selfie' | 'id_document' | 'video_liveness'; photoUrl: string }) {
 return this.request<any>('/api/v1/profiles/me/verify/submit', { method: 'POST', body: JSON.stringify(data) });
 }
 async getVerificationStatus() {
 return this.request<any>('/api/v1/profiles/me/verify/status');
 }
 async logout() {
 return this.request<any>('/api/v1/auth/logout', { method: 'POST' });
 }
 async getMe() {
 return this.request<any>('/api/v1/auth/me');
 }
 // v3.2 — Onboarding completion score (with per-bucket breakdown)
 async getCompletion() {
 return this.request<{ data: {
   score: number;
   threshold: number;
   missing: string[];
   dtm: boolean;
   buckets: Array<{
     key: string; label: string; hint: string;
     pts: number; earned: number; done: boolean;
     fields: string[];
     visibility: 'PUBLIC' | 'MATCHES_ONLY' | 'REQUEST_ACCESS';
   }>;
 } }>('/api/v1/profiles/me/completion');
 }
 async updatePassword(data: { currentPassword: string; newPassword: string }) {
 return this.request<any>('/api/v1/auth/password', { method: 'PUT', body: JSON.stringify(data) });
 }

 // Discover
 async getDiscover(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/discover${qs}`);
 }
 // v3.6.0 — Weekly Top-10 (flag-gated, read-only). Returns null when the
 // backend flag FEATURE_WEEKLY_TOP_ENABLED is OFF (server replies 404).
 async getWeeklyTop(): Promise<{
   data: Array<{
     rank: number;
     targetHash: string;
     user: {
       id: string;
       displayName: string;
       photo: string | null;
       age: number | null;
       city: string | null;
     } | null;
   }>;
   weekIso: string;
   generatedAt: string | null;
 } | null> {
   try {
     const raw = await this.request<{
       data: Array<{
         rank: number;
         computedAt?: string;
         user: {
           id: string;
           username?: string;
           displayName?: string;
           verified?: boolean;
           profile?: { age?: number | null; city?: string | null; datingIntent?: string | null; gender?: string | null; bio?: string | null } | null;
           photos?: Array<{ url?: string } | string> | null;
         } | null;
       }>;
       weekIso: string;
       generatedAt: string | null;
     }>('/api/v1/weekly-top');
     const data = (raw?.data || []).map((r) => {
       const u = r.user;
       const firstPhoto = u?.photos?.[0];
       const photo: string | null = typeof firstPhoto === 'string'
         ? firstPhoto
         : (firstPhoto && typeof firstPhoto === 'object' && 'url' in firstPhoto ? (firstPhoto.url ?? null) : null);
       return {
         rank: r.rank,
         // Server doesn't echo targetHash on the row directly; keep field for
         // forward-compat. Use user.id as a stable key when present.
         targetHash: u?.id || '',
         user: u ? {
           id: u.id,
           displayName: u.displayName || u.username || 'Someone',
           photo,
           age: u.profile?.age ?? null,
           city: u.profile?.city ?? null,
         } : null,
       };
     });
     return { data, weekIso: raw.weekIso, generatedAt: raw.generatedAt };
   } catch (err) {
     if (err instanceof ApiError && err.statusCode === 404) return null;
     throw err;
   }
 }
 async sendLike(toUserId: string, targetType?: string, targetId?: string) {
 return this.request<any>('/api/v1/discover/like', { method: 'POST', body: JSON.stringify({ toUserId, targetType, targetId }) });
 }
 async sendComment(toUserId: string, message: string, type?: string, targetType?: string, targetId?: string) {
 return this.request<any>('/api/v1/discover/comment', { method: 'POST', body: JSON.stringify({ toUserId, message, type, targetType, targetId }) });
 }
 async passUser(userId: string) {
 return this.request<any>('/api/v1/discover/pass', { method: 'POST', body: JSON.stringify({ userId }) });
 }
 async passUserFeedback(userId: string, reason: string, details?: string) {
 return this.request<any>('/api/v1/discover/pass-feedback', { method: 'POST', body: JSON.stringify({ userId, reason, details }) });
 }
 async superLikeUser(userId: string) {
 return this.request<any>(`/api/v1/discover/${userId}/superlike`, { method: 'POST' });
 }

 // Miamo Move
 async sendMiamoMove(toUserId: string, message?: string, targetType?: string, targetId?: string) {
 return this.request<any>('/api/v1/discover/move', { method: 'POST', body: JSON.stringify({ toUserId, message, targetType, targetId }) });
 }
 async getMoveSuggestions(targetId: string) {
 return this.request<{ data: { text: string; reasoning?: string; matchBackProbability?: number }[] }>(`/api/v1/discover/move-suggestions/${targetId}`);
 }
 // v3.6.0 — Move v2 suggestions (5 ranked, scored by sender-voice + receiver-resonance + hook strength).
 // Falls through to a 404 when FEATURE_MOVE_V2_ENABLED is OFF on the server.
 async getMoveV2Suggestions(itemId: string, opts?: { n?: number; seed?: number }) {
 return this.request<{ suggestions: Array<{ text: string; tone: string; slotIndex: number; hookCategory: string; hookText?: string; rightNowMatched?: boolean }>; fallbackCount: number; generatedAt: string }>(
 `/api/v1/creativity/items/${itemId}/move-suggestions-v2`,
 { method: 'POST', body: JSON.stringify(opts ?? {}) },
 );
 }
 // v3.6.0 — Voice fingerprint reveal (sender voice vector + archetype).
 // Returns 404 when FEATURE_VOICE_FINGERPRINT_ENABLED is OFF.
 async getMyVoiceFingerprint() {
 return this.request<{ data: {
   voice: {
     medianLengthChars: number;
     medianLengthWords: number;
     emojiRate: number;
     topEmojis: string[];
     emDashRate: number;
     exclamationRate: number;
     questionRate: number;
     commaPerWord: number;
     fragmentsPerMessage: number;
     lowercaseIRate: number;
     lowercaseStartRate: number;
     typoRateApprox: number;
     contractionRate: number;
     laughTokenRate: number;
     sampleCount: number;
     confidence: number;
   };
   archetype: string | null;
   sentMessageCount: number;
 } }>(`/api/v1/users/me/voice-fingerprint`);
 }
 async getReceivedMoves() { return this.request<any>('/api/v1/discover/moves/received'); }
 async acceptMove(id: string) { return this.request<any>(`/api/v1/discover/moves/${id}/accept`, { method: 'POST' }); }
 async rejectMove(id: string) { return this.request<any>(`/api/v1/discover/moves/${id}/reject`, { method: 'POST' }); }

 // Discover Filters
 async getDiscoverFilters() { return this.request<ApiResponse<DiscoverFilters>>('/api/v1/discover/filters'); }
 async saveDiscoverFilters(filters: Partial<DiscoverFilters>) { return this.request<ApiResponse<DiscoverFilters>>('/api/v1/discover/filters', { method: 'PUT', body: JSON.stringify(filters) }); }

 // ─── v6.6 See-later pile (Discover + DTM) ──────────
 // Persistent deferral pile. `surface` is 'discover' | 'dtm'; `targetId`
 // is the profile id (discover) or question id (dtm). Resolution is
 // idempotent and replaces any prior resolvedAction.
 async deferItem(args: { surface: 'discover' | 'dtm'; targetId: string; topic?: string; batchId?: string; reason?: 'not_now' | 'thinking' | 'unsure' | 'other' }) {
 return this.request<ApiResponse<{ id: string; deferredAt: string }>>('/api/v1/defer', { method: 'POST', body: JSON.stringify(args) });
 }
 async listDeferred(args: { surface: 'discover' | 'dtm'; kind?: 'pending' | 'resolved' | 'all'; limit?: number }) {
 const qs = new URLSearchParams({ surface: args.surface, ...(args.kind ? { kind: args.kind } : {}), ...(args.limit ? { limit: String(args.limit) } : {}) }).toString();
 return this.request<ApiResponse<{ items: Array<{ id: string; surface: string; targetId: string; topic: string | null; deferredAt: string; viewedAt: string | null; resolvedAt: string | null; resolvedAction: string | null }>; count: number }>>(`/api/v1/defer?${qs}`);
 }
 async viewDeferred(id: string) {
 return this.request<ApiResponse<{ id: string; viewedAt: string }>>(`/api/v1/defer/${id}/view`, { method: 'POST' });
 }
 async resolveDeferred(id: string, action: 'like' | 'pass' | 'super_like' | 'see_later' | 'answered' | 'skipped') {
 return this.request<ApiResponse<{ id: string; resolvedAt: string; resolvedAction: string }>>(`/api/v1/defer/${id}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });
 }

 // Matches
 async getMatches(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/matches${qs}`);
 }
 async getIncomingLikes(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/matches/incoming${qs}`);
 }
 async matchBack(userId: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/match-back`, { method: 'POST' }); }
 async matchBackWithMove(userId: string, message: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/match-move`, { method: 'POST', body: JSON.stringify({ message }) }); }
 async holdIncoming(userId: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/hold`, { method: 'POST' }); }
 async resumeIncoming(userId: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/resume`, { method: 'POST' }); }
 async hideIncoming(userId: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/hide`, { method: 'POST' }); }
 async getMatchSuggestions(userId: string) { return this.request<any>(`/api/v1/matches/incoming/${userId}/suggestions`); }
 async getMatchRequests() { return this.request<any>('/api/v1/matches/requests'); }
 async getSentRequests() { return this.request<any>('/api/v1/matches/requests/sent'); }
 async acceptRequest(id: string) { return this.request<any>(`/api/v1/matches/requests/${id}/accept`, { method: 'POST' }); }
 async rejectRequest(id: string) { return this.request<any>(`/api/v1/matches/requests/${id}/reject`, { method: 'POST' }); }
 async unmatch(id: string, reason?: string, details?: string) {
 return this.request<any>(`/api/v1/matches/${id}`, { method: 'DELETE', body: JSON.stringify({ reason, details }) });
 }
 async unmatchByUser(userId: string, reason?: string, details?: string) {
 return this.request<any>(`/api/v1/matches/by-user/${userId}`, { method: 'DELETE', body: JSON.stringify({ reason, details }) });
 }
 async reportByUser(userId: string, reason: string, details?: string) {
 return this.request<any>(`/api/v1/matches/by-user/${userId}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) });
 }
 async blockByUser(userId: string, reason?: string, details?: string) {
 return this.request<any>(`/api/v1/matches/by-user/${userId}/block`, { method: 'POST', body: JSON.stringify({ reason, details }) });
 }
 async favoriteMatch(id: string) { return this.request<any>(`/api/v1/matches/${id}/favorite`, { method: 'POST' }); }
 async pinMatch(id: string) { return this.request<any>(`/api/v1/matches/${id}/pin`, { method: 'POST' }); }
 async reportMatch(id: string, reason: string, details?: string) {
 return this.request<any>(`/api/v1/matches/${id}/report`, { method: 'POST', body: JSON.stringify({ reason, details }) });
 }

 // Messages
 async getChats() { return this.request<any>('/api/v1/messages/chats'); }
 async getArchivedChats() { return this.request<any>('/api/v1/messages/chats/archived'); }
 async getChatMessages(chatId: string, cursor?: string) {
 return this.request<any>(`/api/v1/messages/chats/${chatId}/messages${cursor ? `?cursor=${cursor}` : ''}`);
 }
 async sendMessage(chatId: string, content: string, type?: string, replyToId?: string) {
 return this.request<any>(`/api/v1/messages/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ content, type, replyToId }) });
 }
 async editMessage(id: string, content: string) { return this.request<any>(`/api/v1/messages/messages/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }); }
 async deleteMessageForMe(id: string) { return this.request<any>(`/api/v1/messages/messages/${id}/delete-for-me`, { method: 'POST' }); }
 async deleteMessageForAll(id: string) { return this.request<any>(`/api/v1/messages/messages/${id}/delete-for-all`, { method: 'POST' }); }
 async reactToMessage(id: string, emoji: string) { return this.request<any>(`/api/v1/messages/messages/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }); }
 async pinChat(chatId: string, pinned: boolean) { return this.request<any>(`/api/v1/messages/chats/${chatId}/pin`, { method: 'POST', body: JSON.stringify({ pinned }) }); }
 async muteChat(chatId: string, muted: boolean) { return this.request<any>(`/api/v1/messages/chats/${chatId}/mute`, { method: 'POST', body: JSON.stringify({ muted }) }); }
 async archiveChat(chatId: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/archive`, { method: 'POST', body: JSON.stringify({ archived: true }) }); }
 async unarchiveChat(chatId: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/unarchive`, { method: 'POST' }); }
 async setChatTheme(chatId: string, theme: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/theme`, { method: 'POST', body: JSON.stringify({ theme }) }); }
 async clearChat(chatId: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/clear`, { method: 'DELETE' }); }
 async searchMessages(chatId: string, q: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/search?q=${encodeURIComponent(q)}`); }
 async getChatSuggestions(chatId: string, context?: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/suggestions`, { method: 'POST', body: JSON.stringify({ context }) }); }
 async getChatSuggestionsV4(chatId: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/suggestions-v4`, { method: 'POST', body: JSON.stringify({}) }); }
 async checkContent(content: string) { return this.request<any>('/api/v1/messages/check-content', { method: 'POST', body: JSON.stringify({ content }) }); }
 async getChatBackgrounds() { return this.request<any>('/api/v1/messages/backgrounds'); }
 async setChatBackground(chatId: string, background: string) { return this.request<any>(`/api/v1/messages/chats/${chatId}/theme`, { method: 'POST', body: JSON.stringify({ background }) }); }

 // Beats
 async getBeats(state?: string) { return this.request<any>(`/api/v1/beats${state ? `?state=${state}` : ''}`); }
 async startBeat(matchedUserId: string) { return this.request<any>('/api/v1/beats/start', { method: 'POST', body: JSON.stringify({ matchedUserId }) }); }
 async completeBeat(id: string, type?: string, content?: string) { return this.request<any>(`/api/v1/beats/${id}/complete`, { method: 'POST', body: JSON.stringify({ type, content }) }); }
 async missBeat(id: string) { return this.request<any>(`/api/v1/beats/${id}/miss`, { method: 'POST' }); }
 async expireBeat(id: string) { return this.request<any>(`/api/v1/beats/${id}/expire`, { method: 'POST' }); }
 async restoreBeat(id: string) { return this.request<any>(`/api/v1/beats/${id}/restore`, { method: 'POST' }); }
 async archiveBeat(id: string) { return this.request<any>(`/api/v1/beats/${id}/archive`, { method: 'POST' }); }
 async viewBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/view`, { method: 'POST' }); }
 async replayBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/view?mode=replay`, { method: 'POST' }); }
 async saveBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/save`, { method: 'POST' }); }
 async unsaveBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/unsave`, { method: 'POST' }); }
 async screenshotBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/screenshot`, { method: 'POST' }); }
 async downloadBeatEvent(eventId: string) { return this.request<any>(`/api/v1/beats/events/${eventId}/download`, { method: 'POST' }); }

 // Feed
 async getFeed(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/feed${qs}`);
 }
 async createPost(data: { type?: string; content: string; mediaUrl?: string; visibility?: string }) {
 return this.request<any>('/api/v1/feed', { method: 'POST', body: JSON.stringify(data) });
 }
 async deletePost(id: string) { return this.request<any>(`/api/v1/feed/${id}`, { method: 'DELETE' }); }
 async reactToPost(id: string, type?: string) { return this.request<any>(`/api/v1/feed/${id}/react`, { method: 'POST', body: JSON.stringify({ type }) }); }
 async commentOnPost(id: string, content: string) { return this.request<any>(`/api/v1/feed/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }); }
 async getPostComments(id: string) { return this.request<any>(`/api/v1/feed/${id}/comments`); }

 // Stories
 async getStories() { return this.request<any>('/api/v1/stories'); }
 async getMyStories() { return this.request<any>('/api/v1/stories/mine'); }
 async createStory(data: any) { return this.request<any>('/api/v1/stories', { method: 'POST', body: JSON.stringify(data) }); }
 async viewStory(id: string) { return this.request<any>(`/api/v1/stories/${id}/view`, { method: 'POST' }); }
 async likeStory(id: string) { return this.request<any>(`/api/v1/stories/${id}/like`, { method: 'POST' }); }
 async reactToStory(id: string, reaction: string) { return this.request<any>(`/api/v1/stories/${id}/react`, { method: 'POST', body: JSON.stringify({ reaction }) }); }
 async getStoryComments(id: string) { return this.request<any>(`/api/v1/stories/${id}/comments`); }
 async commentOnStory(id: string, content: string, parentId?: string) { return this.request<any>(`/api/v1/stories/${id}/comments`, { method: 'POST', body: JSON.stringify({ content, parentId }) }); }
 async deleteStoryComment(storyId: string, commentId: string) { return this.request<any>(`/api/v1/stories/${storyId}/comments/${commentId}`, { method: 'DELETE' }); }
 async postStoryToFeed(id: string) { return this.request<any>(`/api/v1/stories/${id}/post-to-feed`, { method: 'POST' }); }
 async deleteStory(id: string) { return this.request<any>(`/api/v1/stories/${id}`, { method: 'DELETE' }); }

 // Videos
 async getVideos(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/videos${qs}`);
 }
 async createVideo(data: any) { return this.request<any>('/api/v1/videos', { method: 'POST', body: JSON.stringify(data) }); }
 async reactToVideo(id: string, type?: string) { return this.request<any>(`/api/v1/videos/${id}/react`, { method: 'POST', body: JSON.stringify({ type }) }); }
 async commentOnVideo(id: string, content: string) { return this.request<any>(`/api/v1/videos/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }); }

 // Creativity
 async getCreativityCategories() { return this.request<any>('/api/v1/creativity/categories'); }
 async getCreativityFeed(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/creativity/feed${qs}`);
 }
 async getCreativityItems(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/creativity/items${qs}`);
 }
 async createCreativityItem(data: any) { return this.request<any>('/api/v1/creativity/items', { method: 'POST', body: JSON.stringify(data) }); }
 async deleteCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}`, { method: 'DELETE' }); }
 async reactToCreativity(id: string, type?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/react`, { method: 'POST', body: JSON.stringify({ type }) }); }
 async commentOnCreativity(id: string, content: string) { return this.request<any>(`/api/v1/creativity/items/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }); }
 async getCreativityComments(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/comments`); }
 async viewCreativityItem(id: string, durationMs?: number) { return this.request<any>(`/api/v1/creativity/items/${id}/view`, { method: 'POST', body: JSON.stringify({ durationMs }) }); }
 async hideCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/hide`, { method: 'POST' }); }
 async dislikeCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/dislike`, { method: 'POST' }); }
 async notInterestedCreativityItem(id: string, reason?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/not-interested`, { method: 'POST', body: JSON.stringify({ reason }) }); }
 async reportCreativityItem(id: string, reason?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/report`, { method: 'POST', body: JSON.stringify({ reason }) }); }
 async hideCreativityAuthor(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/hide-author`, { method: 'POST' }); }
 async getCreativityReels(params?: Record<string, string>) {
 const qs = params ? '?' + new URLSearchParams(params).toString() : '';
 return this.request<any>(`/api/v1/creativity/reels${qs}`);
 }
 async getCreativityMoveSuggestions(id: string, n?: number) {
 return this.request<any>(`/api/v1/creativity/items/${id}/move-suggestions${n ? `?n=${n}` : ''}`);
 }
 async getSpotlightEarnOpportunities() { return this.request<any>('/api/v1/creativity/spotlight/earn-opportunities'); }
 async claimSpotlightStreak() { return this.request<any>('/api/v1/creativity/spotlight/claim-streak', { method: 'POST' }); }
 async sendCreativityMove(id: string, message?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/move`, { method: 'POST', body: JSON.stringify({ message }) }); }
 async shareCreativityItem(id: string, channel?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/share`, { method: 'POST', body: JSON.stringify({ channel }) }); }
 async saveCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/save`, { method: 'POST' }); }
 async getCreativityTrends(category?: string) { return this.request<any>(`/api/v1/creativity/trends${category ? `?category=${category}` : ''}`); }
 // Spotlight
 async getSpotlight() { return this.request<any>('/api/v1/creativity/spotlight'); }
 async purchaseSpotlight(minutes: number) { return this.request<any>('/api/v1/creativity/spotlight/purchase', { method: 'POST', body: JSON.stringify({ minutes }) }); }
 async getCreativityVault() { return this.request<any>('/api/v1/creativity/vault'); }
 async getCreativityLiveTrending() { return this.request<any>('/api/v1/creativity/trending/live'); }

 // Search
 async search(q: string, type?: string) { return this.request<ApiResponse<SearchResult[]>>(`/api/v1/search?q=${encodeURIComponent(q)}&type=${type || 'all'}`); }

 // AI Match
 async getAiSuggestions() { return this.request<any>('/api/v1/ai-match/suggestions'); }
 async getAiScore(targetId: string) { return this.request<any>(`/api/v1/ai-match/score/${targetId}`); }
 async getWhyThisMatch(targetId: string) { return this.request<any>(`/api/v1/ai-match/why/${targetId}`); }

 // Vibe Check
 async saveVibeCheck(data: { mood: string; energy: number; topics: string[]; intent: string }) {
 return this.request<any>('/api/v1/vibe-check', { method: 'POST', body: JSON.stringify(data) });
 }
 async getVibeHistory() { return this.request<any>('/api/v1/vibe-check'); }
 async getLatestVibe() { return this.request<any>('/api/v1/vibe-check/latest'); }
 async getVibeMatches() { return this.request<any>('/api/v1/vibe-check/matches'); }

 // Notifications
 async getNotifications(unreadOnly?: boolean) { return this.request<ApiResponse<MiamoNotification[]>>(`/api/v1/notifications${unreadOnly ? '?unreadOnly=true' : ''}`); }
 async getNotificationCount() { return this.request<ApiResponse<{ count: number }>>('/api/v1/notifications/count'); }
 async markNotificationRead(id: string) { return this.request<any>(`/api/v1/notifications/${id}/read`, { method: 'POST' }); }
 async markAllNotificationsRead() { return this.request<any>('/api/v1/notifications/read-all', { method: 'POST' }); }

 // Settings
 async getSettings() { return this.request<ApiResponse<MiamoSettings>>('/api/v1/settings'); }
 async updateSettings(data: Partial<MiamoSettings>) { return this.request<ApiResponse<MiamoSettings>>('/api/v1/settings', { method: 'PUT', body: JSON.stringify(data) }); }
 async updatePrivacy(data: Record<string, boolean | string>) { return this.request<ApiResponse<Record<string, any>>>('/api/v1/settings/privacy', { method: 'PUT', body: JSON.stringify(data) }); }
 async deactivateAccount() { return this.request<any>('/api/v1/settings/deactivate', { method: 'POST' }); }
 async deleteAccount() { return this.request<any>('/api/v1/settings/delete', { method: 'DELETE' }); }
 async exportData() { return this.request<any>('/api/v1/settings/export'); }
 async getBlockList() { return this.request<any>('/api/v1/settings/blocks'); }

 // Profiles
 async getMyProfile() { return this.request<ApiResponse<MiamoProfile>>('/api/v1/profiles/me'); }
 async updateProfile(data: Partial<MiamoProfile>) { return this.request<ApiResponse<MiamoProfile>>('/api/v1/profiles/me', { method: 'PUT', body: JSON.stringify(data) }); }
 async updatePrompts(prompts: Array<{ question: string; answer: string; position: number }>) { return this.request<ApiResponse<unknown>>('/api/v1/profiles/me/prompts', { method: 'PUT', body: JSON.stringify({ prompts }) }); }
 async updateInterests(interests: string[]) { return this.request<ApiResponse<unknown>>('/api/v1/profiles/me/interests', { method: 'PUT', body: JSON.stringify({ interests }) }); }
 async uploadPhoto(formData: FormData) {
 const token = this.getToken();
 const headers: Record<string, string> = {};
 if (token) headers['Authorization'] = `Bearer ${token}`;
 const res = await fetch(`${this.baseUrl}/api/v1/profiles/me/photos`, { method: 'POST', headers, body: formData, credentials: 'include' });
 if (!res.ok) throw new ApiError('Upload failed', res.status, 'UPLOAD_ERROR');
 return res.json();
 }
 async deletePhoto(photoId: string) { return this.request<any>(`/api/v1/profiles/me/photos/${photoId}`, { method: 'DELETE' }); }

 // Safety
 async reportUser(data: { reportedId: string; reason: string; details?: string; targetType?: string; targetId?: string }) { return this.request<ApiResponse<unknown>>('/api/v1/safety/report', { method: 'POST', body: JSON.stringify(data) }); }
 async blockUser(blockedId: string) { return this.request<any>('/api/v1/safety/block', { method: 'POST', body: JSON.stringify({ blockedId }) }); }
 async unblockUser(blockedId: string) { return this.request<any>('/api/v1/safety/unblock', { method: 'POST', body: JSON.stringify({ blockedId }) }); }
 async getSafetyTips() { return this.request<any>('/api/v1/safety/tips'); }

 // Matrimonial (Date to Marry)
 async getMatrimonialProfile() { return this.request<any>('/api/v1/matrimonial/profile'); }
 async updateMatrimonialProfile(data: any) { return this.request<any>('/api/v1/matrimonial/profile', { method: 'PUT', body: JSON.stringify(data) }); }
 async browseMatrimonial(params?: Record<string, string | number | boolean>) {
   const qs = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
   return this.request<any>(`/api/v1/matrimonial/browse${qs}`);
 }
 async getMatrimonialUserProfile(userId: string) { return this.request<any>(`/api/v1/matrimonial/profile/${userId}`); }
 async getMatrimonialMatches() { return this.request<any>('/api/v1/matrimonial/matches'); }
 async getMatrimonialTemplates() { return this.request<any>('/api/v1/matrimonial/templates'); }
 async requestAccess(targetUserId: string, accessType: string, message?: string) {
 return this.request<any>('/api/v1/matrimonial/access/request', { method: 'POST', body: JSON.stringify({ targetUserId, accessType, message }) });
 }
 async getIncomingAccessRequests() { return this.request<any>('/api/v1/matrimonial/access/incoming'); }
 async getSentAccessRequests() { return this.request<any>('/api/v1/matrimonial/access/sent'); }
 async handleAccessRequest(id: string, action: 'grant' | 'deny' | 'revoke') {
 return this.request<any>(`/api/v1/matrimonial/access/${id}/${action}`, { method: 'POST' });
 }
 async getMatrimonialNumerology() { return this.request<any>('/api/v1/matrimonial/numerology'); }
 async getMatrimonialNumerologyCompat(userId: string) { return this.request<any>(`/api/v1/matrimonial/numerology/compatibility/${userId}`); }
 async getMatrimonialCompatibility(userId: string) { return this.request<any>(`/api/v1/matrimonial/compatibility/${userId}`); }
 async uploadKundli(data: { kundliUrl?: string; kundliData?: any; nakshatra?: string }) {
 return this.request<any>('/api/v1/matrimonial/kundli', { method: 'POST', body: JSON.stringify(data) });
 }
 async browseMatrimonialAdvanced(params?: Record<string, string | number | boolean>) {
   const qs = params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';
   return this.request<any>(`/api/v1/matrimonial/browse/advanced${qs}`);
 }
 async getDtmChats() { return this.request<any>('/api/v1/matrimonial/chat'); }
 async getDtmChatMessages(userId: string) { return this.request<any>(`/api/v1/matrimonial/chat/${userId}`); }
 async sendDtmMessage(recipientId: string, message: string, type?: string) {
 return this.request<any>('/api/v1/matrimonial/chat/send', { method: 'POST', body: JSON.stringify({ recipientId, message, type }) });
 }

 // ─── v3.6.0 — DTM Family Brief (parent-shareable bio) ─────────────────
 // POST returns { token, url, expiresAt, note }. Format defaults to 'image'
 // at the call-site (WhatsApp-targeted). `trackViews` defaults to false.
 // Server emits the `family_brief.generated` activity event on success.
 async generateFamilyBrief(args: { format: 'pdf' | 'image' | 'text'; trackViews?: boolean }) {
   return this.request<{ token: string; url: string; expiresAt: string; note?: string }>(
     '/api/v1/dtm/family-brief/generate',
     { method: 'POST', body: JSON.stringify({ format: args.format, trackViews: !!args.trackViews }) },
   );
 }

 // ─── v3.6.0 — Discover "Why am I seeing this" explainer ──────────────
 // Returns the top-3 contributing ingredients with star counts (1–3) and
 // raw contribution scores. Resolves to `null` when the feature flag is
 // off (server returns 404) so the caller can hide the entry-point.
 async getDiscoverWhy(targetId: string): Promise<{
   stars: Array<{ key: string; label: string; contribution: number; stars: 1 | 2 | 3 }>;
   total: number;
   weights: Record<string, number>;
 } | null> {
   try {
     return await this.request(`/api/v1/discover/${targetId}/why`);
   } catch (err) {
     if (err instanceof ApiError && err.statusCode === 404) return null;
     throw err;
   }
 }

 // Health
 async health() { return this.request<any>('/health'); }

 // ─── User Data (persisted state) ────────────────────
 async getUserData(type: string, limit?: number) {
 const qs = limit ? `?type=${type}&limit=${limit}` : `?type=${type}`;
 return this.request<any>(`/api/v1/user-data${qs}`);
 }
 async saveUserData(type: string, data: any) {
 return this.request<any>('/api/v1/user-data', { method: 'POST', body: JSON.stringify({ type, data }) });
 }
 async updateUserData(id: string, data: any) {
 return this.request<any>(`/api/v1/user-data/${id}`, { method: 'PUT', body: JSON.stringify({ data }) });
 }
 async deleteUserData(id: string) {
 return this.request<any>(`/api/v1/user-data/${id}`, { method: 'DELETE' });
 }
 async upsertUserData(type: string, data: any) {
 return this.request<any>(`/api/v1/user-data/upsert/${type}`, { method: 'PUT', body: JSON.stringify({ data }) });
 }

 // ─── Activity Tracking ─────────────────────────────
 trackActivity(action: string, targetType: string, targetId?: string, metadata?: Record<string, unknown>, durationMs?: number) {
 const body: Record<string, unknown> = { action, targetType };
 if (targetId) body.targetId = targetId;
 if (metadata) body.metadata = metadata;
 if (durationMs) body.durationMs = durationMs;
 this.request('/api/v1/activity/track', { method: 'POST', body: JSON.stringify(body) }).catch(() => {});
 }

 // ─── Additional Backend Endpoints ──────────────────
 async refreshToken() { return this.request<any>('/api/v1/auth/refresh', { method: 'POST' }); }
 async getSessions() { return this.request<ApiResponse<MiamoSession[]>>('/api/v1/auth/sessions'); }
 async revokeSession(id: string) { return this.request<any>(`/api/v1/auth/sessions/${id}/revoke`, { method: 'POST' }); }
 async reactivateAccount() { return this.request<any>('/api/v1/settings/reactivate', { method: 'POST' }); }
 async getBookmarks() { return this.request<ApiResponse<MiamoBookmark[]>>('/api/v1/bookmarks'); }
 async createBookmark(targetId: string) { return this.request<ApiResponse<MiamoBookmark>>('/api/v1/bookmarks', { method: 'POST', body: JSON.stringify({ targetId }) }); }
 async deleteBookmark(id: string) { return this.request<any>(`/api/v1/bookmarks/${id}`, { method: 'DELETE' }); }
 async getActivityAnalysis() { return this.request<any>('/api/v1/activity/analysis'); }
 async getMyReports() { return this.request<any>('/api/v1/safety/reports'); }
 async editPost(id: string, data: { content: string }) { return this.request<any>(`/api/v1/feed/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
 async viewVideo(id: string) { return this.request<any>(`/api/v1/videos/${id}/view`, { method: 'POST' }); }
 async getVideoComments(id: string) { return this.request<any>(`/api/v1/videos/${id}/comments`); }
 async getStoryViewers(id: string) { return this.request<any>(`/api/v1/stories/${id}/viewers`); }
 async getStoryLikes(id: string) { return this.request<any>(`/api/v1/stories/${id}/likes`); }
 async openChatWith(userId: string) { return this.request<any>(`/api/v1/messages/chats/with/${userId}`, { method: 'POST' }); }
 async getUserById(id: string) { return this.request<any>(`/api/v1/users/${id}`); }
}

export const api = new ApiClient(API_URL);
export { ApiError };
