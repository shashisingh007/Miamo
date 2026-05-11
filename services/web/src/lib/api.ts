// ─── Miamo API Client ────────────────────────────────
// Connects to real backend API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public data: any;
  constructor(message: string, statusCode: number, code?: string, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'UNKNOWN_ERROR';
    this.data = data;
  }
}

class ApiClient {
  private baseUrl: string;
  constructor(baseUrl: string) { this.baseUrl = baseUrl; }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('miamo_token');
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'Network error' } }));
        const apiErr = new ApiError(err.error?.message || 'Request failed', res.status, err.error?.code, err.data);
        // Only clear stale token — do NOT auto-redirect; let pages handle their own fallback
        if (typeof window !== 'undefined' && (res.status === 401 || (res.status === 404 && path.includes('/auth/me')))) {
          localStorage.removeItem('miamo_token');
          try { localStorage.removeItem('miamo-auth'); } catch {}
        }
        throw apiErr;
      }
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('Network error — is the API server running?', 0, 'NETWORK_ERROR');
    }
  }

  // Auth
  async register(data: { email: string; password: string; displayName: string }) {
    return this.request<any>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }
  async login(data: { email: string; password: string }) {
    return this.request<any>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(data) });
  }
  async logout() {
    return this.request<any>('/api/v1/auth/logout', { method: 'POST' });
  }
  async getMe() {
    return this.request<any>('/api/v1/auth/me');
  }

  // Discover
  async getDiscover(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/discover${qs}`);
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

  // Miamo Move
  async sendMiamoMove(toUserId: string, message?: string, targetType?: string, targetId?: string) {
    return this.request<any>('/api/v1/discover/move', { method: 'POST', body: JSON.stringify({ toUserId, message, targetType, targetId }) });
  }
  async getReceivedMoves() { return this.request<any>('/api/v1/discover/moves/received'); }
  async acceptMove(id: string) { return this.request<any>(`/api/v1/discover/moves/${id}/accept`, { method: 'POST' }); }
  async rejectMove(id: string) { return this.request<any>(`/api/v1/discover/moves/${id}/reject`, { method: 'POST' }); }

  // Discover Filters
  async getDiscoverFilters() { return this.request<any>('/api/v1/discover/filters'); }
  async saveDiscoverFilters(filters: any) { return this.request<any>('/api/v1/discover/filters', { method: 'PUT', body: JSON.stringify(filters) }); }

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
  async reactToCreativity(id: string, type?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/react`, { method: 'POST', body: JSON.stringify({ type }) }); }
  async commentOnCreativity(id: string, content: string) { return this.request<any>(`/api/v1/creativity/items/${id}/comments`, { method: 'POST', body: JSON.stringify({ content }) }); }
  async getCreativityComments(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/comments`); }
  async viewCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/view`, { method: 'POST' }); }
  async hideCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/hide`, { method: 'POST' }); }
  async sendCreativityMove(id: string, message?: string) { return this.request<any>(`/api/v1/creativity/items/${id}/move`, { method: 'POST', body: JSON.stringify({ message }) }); }
  async shareCreativityItem(id: string) { return this.request<any>(`/api/v1/creativity/items/${id}/share`, { method: 'POST' }); }
  async getCreativityTrends(category?: string) { return this.request<any>(`/api/v1/creativity/trends${category ? `?category=${category}` : ''}`); }

  // Search
  async search(q: string, type?: string) { return this.request<any>(`/api/v1/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`); }

  // AI Match
  async getAiSuggestions() { return this.request<any>('/api/v1/ai-match/suggestions'); }
  async getAiScore(targetId: string) { return this.request<any>(`/api/v1/ai-match/score/${targetId}`); }
  async getWhyThisMatch(targetId: string) { return this.request<any>(`/api/v1/ai-match/why/${targetId}`); }

  // Notifications
  async getNotifications(unreadOnly?: boolean) { return this.request<any>(`/api/v1/notifications${unreadOnly ? '?unreadOnly=true' : ''}`); }
  async getNotificationCount() { return this.request<any>('/api/v1/notifications/count'); }
  async markNotificationRead(id: string) { return this.request<any>(`/api/v1/notifications/${id}/read`, { method: 'POST' }); }
  async markAllNotificationsRead() { return this.request<any>('/api/v1/notifications/read-all', { method: 'POST' }); }

  // Settings
  async getSettings() { return this.request<any>('/api/v1/settings'); }
  async updateSettings(data: any) { return this.request<any>('/api/v1/settings', { method: 'PUT', body: JSON.stringify(data) }); }
  async updatePrivacy(data: any) { return this.request<any>('/api/v1/settings/privacy', { method: 'PUT', body: JSON.stringify(data) }); }
  async deactivateAccount() { return this.request<any>('/api/v1/settings/deactivate', { method: 'POST' }); }
  async exportData() { return this.request<any>('/api/v1/settings/export'); }
  async getBlockList() { return this.request<any>('/api/v1/settings/blocks'); }

  // Profiles
  async getMyProfile() { return this.request<any>('/api/v1/profiles/me'); }
  async updateProfile(data: any) { return this.request<any>('/api/v1/profiles/me', { method: 'PUT', body: JSON.stringify(data) }); }
  async updatePrompts(prompts: any[]) { return this.request<any>('/api/v1/profiles/me/prompts', { method: 'PUT', body: JSON.stringify({ prompts }) }); }
  async updateInterests(interests: string[]) { return this.request<any>('/api/v1/profiles/me/interests', { method: 'PUT', body: JSON.stringify({ interests }) }); }

  // Safety
  async reportUser(data: any) { return this.request<any>('/api/v1/safety/report', { method: 'POST', body: JSON.stringify(data) }); }
  async blockUser(blockedId: string) { return this.request<any>('/api/v1/safety/block', { method: 'POST', body: JSON.stringify({ blockedId }) }); }
  async unblockUser(blockedId: string) { return this.request<any>('/api/v1/safety/unblock', { method: 'POST', body: JSON.stringify({ blockedId }) }); }
  async getSafetyTips() { return this.request<any>('/api/v1/safety/tips'); }

  // Matrimonial (Date to Marry)
  async getMatrimonialProfile() { return this.request<any>('/api/v1/matrimonial/profile'); }
  async updateMatrimonialProfile(data: any) { return this.request<any>('/api/v1/matrimonial/profile', { method: 'PUT', body: JSON.stringify(data) }); }
  async browseMatrimonial(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
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
  async browseMatrimonialAdvanced(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request<any>(`/api/v1/matrimonial/browse/advanced${qs}`);
  }
  async getDtmChats() { return this.request<any>('/api/v1/matrimonial/chat'); }
  async getDtmChatMessages(userId: string) { return this.request<any>(`/api/v1/matrimonial/chat/${userId}`); }
  async sendDtmMessage(recipientId: string, message: string, type?: string) {
    return this.request<any>('/api/v1/matrimonial/chat/send', { method: 'POST', body: JSON.stringify({ recipientId, message, type }) });
  }

  // Health
  async health() { return this.request<any>('/health'); }
}

export const api = new ApiClient(API_URL);
export { ApiError };
