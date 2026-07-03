// ─── Miamo UserActivityAnalyzer ──────────────────────
// Processes raw UserActivity records into actionable intelligence:
//   1. User preference vectors (for collaborative filtering)
//   2. Engagement scores (for ranking)
//   3. Behavioral clusters (for "similar users like" features)
//   4. Response time patterns (for matching active communicators)
//   5. Content taste profiles (for feed personalization)
//   6. Temporal patterns (for time-of-day optimization)
//
// Called by recommendation algorithms (Phase 3) to get rich signals.

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export interface RawActivity {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: string | null; // JSON string
  durationMs?: number | null;
  sessionId?: string | null;
  createdAt: Date | string;
}

export interface UserPreferenceVector {
  /** Profile attributes the user tends to like (weighted) */
  likedProfiles: Set<string>;
  passedProfiles: Set<string>;
  superLikedProfiles: Set<string>;
  viewedProfiles: Map<string, number>; // profileId → total dwell time ms
  /** Learned preferences from behavioral data */
  preferredCities: Array<{ city: string; weight: number }>;
  preferredIntents: Array<{ intent: string; weight: number }>;
  preferredAge: { min: number; max: number; center: number } | null;
  /** Interest affinities learned from likes/dwell */
  interestAffinities: Map<string, number>; // interest → affinity score
  /** Content category preferences */
  contentCategories: Map<string, number>; // category → engagement score
  /** Beat/music genre preferences */
  beatGenres: Map<string, number>; // genre → affinity
}

export interface EngagementScore {
  /** Overall engagement 0-100 */
  overall: number;
  /** Breakdown by category */
  discover: number;
  messaging: number;
  content: number;
  social: number;
  /** Activity frequency (actions per day avg) */
  actionsPerDay: number;
  /** Retention: days active in last 14 days */
  activeDays14: number;
  /** Session metrics */
  avgSessionDurationMs: number;
  totalSessions: number;
  /** Response metrics */
  avgResponseTimeMs: number;
  responseRate: number; // 0-1
}

export interface BehavioralCluster {
  /** Cluster label */
  type: 'browser' | 'engager' | 'communicator' | 'creator' | 'lurker' | 'power-user';
  /** Confidence 0-1 */
  confidence: number;
  /** Primary actions this user performs */
  topActions: Array<{ action: string; count: number }>;
  /** Peak activity hours (0-23) */
  activeHours: number[];
  /** Preferred content types */
  preferredContentTypes: string[];
  /** Average session patterns */
  avgSessionActions: number;
}

export interface ResponseTimeProfile {
  /** Average response time to messages in hours */
  avgResponseTimeHrs: number;
  /** Response rate (messages responded / messages received) */
  responseRate: number;
  /** Response time by hour of day */
  responseByHour: Map<number, number>; // hour → avg response time ms
  /** Conversation initiation rate */
  initiationRate: number;
}

export interface ContentTasteProfile {
  /** Creativity categories the user engages with most */
  topCategories: Array<{ category: string; score: number }>;
  /** Content types (photo, video, text, audio) preference */
  contentTypePrefs: Map<string, number>;
  /** Authors the user engages with most */
  topAuthors: Array<{ authorId: string; engageCount: number }>;
  /** Average dwell time on content */
  avgContentDwellMs: number;
  /** Search terms used */
  searchTerms: Array<{ term: string; count: number }>;
}

export interface TemporalPattern {
  /** Distribution of actions by hour of day (0-23) */
  hourlyDistribution: number[]; // 24 slots, each = action count
  /** Peak hours (top 3 most active) */
  peakHours: number[];
  /** Day of week distribution (0=Sun) */
  dailyDistribution: number[]; // 7 slots
  /** Peak days */
  peakDays: number[];
  /** Is this a morning, afternoon, evening, or night user? */
  primaryTimeSlot: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface FullUserAnalysis {
  userId: string;
  analyzedAt: Date;
  activityCount: number;
  preferences: UserPreferenceVector;
  engagement: EngagementScore;
  cluster: BehavioralCluster;
  responseProfile: ResponseTimeProfile;
  contentTaste: ContentTasteProfile;
  temporal: TemporalPattern;
}

// ═══════════════════════════════════════════════════════
// ANALYZER CLASS
// ═══════════════════════════════════════════════════════

export class UserActivityAnalyzer {
  private activities: RawActivity[];
  private userId: string;

  constructor(userId: string, activities: RawActivity[]) {
    this.userId = userId;
    this.activities = activities;
  }

  // ─── Parse metadata safely ──────────────────────────
  private parseMeta(activity: RawActivity): Record<string, any> {
    if (!activity.metadata) return {};
    try { return JSON.parse(activity.metadata); } catch { return {}; }
  }

  // ─── Filter activities by criteria ──────────────────
  private filterByAction(...actions: string[]): RawActivity[] {
    return this.activities.filter(a => actions.includes(a.action));
  }

  private filterByTargetType(...types: string[]): RawActivity[] {
    return this.activities.filter(a => types.includes(a.targetType));
  }

  // ═══════════════════════════════════════════════════════
  // 1. PREFERENCE VECTOR
  // ═══════════════════════════════════════════════════════

  buildPreferenceVector(): UserPreferenceVector {
    const likedProfiles = new Set<string>();
    const passedProfiles = new Set<string>();
    const superLikedProfiles = new Set<string>();
    const viewedProfiles = new Map<string, number>();
    const cityPrefs: Record<string, number> = {};
    const intentPrefs: Record<string, number> = {};
    const agePrefs: number[] = [];
    const interestAffinities = new Map<string, number>();
    const contentCategories = new Map<string, number>();
    const beatGenres = new Map<string, number>();

    for (const a of this.activities) {
      const meta = this.parseMeta(a);

      // Profile likes/passes/super-likes
      if (a.action === 'like' && a.targetType === 'profile' && a.targetId) {
        likedProfiles.add(a.targetId);
        if (meta.city) cityPrefs[meta.city.toLowerCase()] = (cityPrefs[meta.city.toLowerCase()] || 0) + 3;
        if (meta.age) agePrefs.push(meta.age);
        if (meta.intent) intentPrefs[meta.intent] = (intentPrefs[meta.intent] || 0) + 3;
        if (meta.interests) {
          for (const i of meta.interests as string[]) {
            interestAffinities.set(i, (interestAffinities.get(i) || 0) + 3);
          }
        }
      }
      if (a.action === 'super_like' && a.targetId) {
        superLikedProfiles.add(a.targetId);
        likedProfiles.add(a.targetId);
        if (meta.city) cityPrefs[meta.city.toLowerCase()] = (cityPrefs[meta.city.toLowerCase()] || 0) + 5;
        if (meta.age) agePrefs.push(meta.age);
        if (meta.intent) intentPrefs[meta.intent] = (intentPrefs[meta.intent] || 0) + 5;
      }
      if (a.action === 'pass' && a.targetId) {
        passedProfiles.add(a.targetId);
      }

      // Profile views with dwell time
      if ((a.action === 'view' || a.action === 'profile_view' || a.action === 'view_profile') && a.targetType === 'profile' && a.targetId) {
        const current = viewedProfiles.get(a.targetId) || 0;
        viewedProfiles.set(a.targetId, current + (a.durationMs || 2000));
        if (meta.city) cityPrefs[meta.city.toLowerCase()] = (cityPrefs[meta.city.toLowerCase()] || 0) + 1;
        if (meta.age) agePrefs.push(meta.age);
      }

      // Long dwell = implicit interest
      if (a.durationMs && a.durationMs > 15000 && a.targetId && a.targetType === 'profile') {
        // Profile with 15s+ dwell gets boost similar to half a like
        if (meta.city) cityPrefs[meta.city.toLowerCase()] = (cityPrefs[meta.city.toLowerCase()] || 0) + 1.5;
        if (meta.interests) {
          for (const i of meta.interests as string[]) {
            interestAffinities.set(i, (interestAffinities.get(i) || 0) + 1);
          }
        }
      }

      // Content engagement → category preferences
      if (a.action === 'content_engage' && meta.category) {
        const weight = meta.engageAction === 'share' ? 4 : meta.engageAction === 'comment' ? 3 : meta.engageAction === 'like' ? 2 : 1;
        contentCategories.set(meta.category, (contentCategories.get(meta.category) || 0) + weight);
      }
      if ((a.targetType === 'creativity' || a.targetType === 'feed') && meta.category) {
        contentCategories.set(meta.category, (contentCategories.get(meta.category) || 0) + 1);
      }

      // Beat engagement → genre preferences
      if (a.action.startsWith('beat_') && meta.genre) {
        const weight = a.action === 'beat_like' ? 3 : a.action === 'beat_play' ? 1 : 2;
        beatGenres.set(meta.genre, (beatGenres.get(meta.genre) || 0) + weight);
      }

      // Match actions strengthen preference for matched user traits
      if (a.action === 'match_action' && meta.matchAction === 'accept') {
        if (meta.intent) intentPrefs[meta.intent] = (intentPrefs[meta.intent] || 0) + 5;
        if (meta.city) cityPrefs[meta.city.toLowerCase()] = (cityPrefs[meta.city.toLowerCase()] || 0) + 4;
      }
    }

    // Build sorted preference arrays
    const preferredCities = Object.entries(cityPrefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, weight]) => ({ city, weight }));

    const preferredIntents = Object.entries(intentPrefs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([intent, weight]) => ({ intent, weight }));

    const preferredAge = agePrefs.length >= 3
      ? {
          min: Math.min(...agePrefs) - 2,
          max: Math.max(...agePrefs) + 2,
          center: Math.round(agePrefs.reduce((s, a) => s + a, 0) / agePrefs.length),
        }
      : null;

    return {
      likedProfiles, passedProfiles, superLikedProfiles, viewedProfiles,
      preferredCities, preferredIntents, preferredAge,
      interestAffinities, contentCategories, beatGenres,
    };
  }

  // ═══════════════════════════════════════════════════════
  // 2. ENGAGEMENT SCORE
  // ═══════════════════════════════════════════════════════

  computeEngagementScore(): EngagementScore {
    if (this.activities.length === 0) {
      return { overall: 0, discover: 0, messaging: 0, content: 0, social: 0, actionsPerDay: 0, activeDays14: 0, avgSessionDurationMs: 0, totalSessions: 0, avgResponseTimeMs: 0, responseRate: 0 };
    }

    // Time range
    const now = Date.now();
    const oldest = new Date(this.activities[this.activities.length - 1]?.createdAt || now).getTime();
    const daySpan = Math.max(1, (now - oldest) / 86400000);

    // Actions per day
    const actionsPerDay = this.activities.length / daySpan;

    // Category breakdown
    const discoverActions = this.activities.filter(a =>
      ['like', 'pass', 'super_like', 'view_profile', 'filter_change'].includes(a.action) || a.targetType === 'profile'
    ).length;
    const messagingActions = this.activities.filter(a =>
      a.action.startsWith('message_') || a.action === 'open_chat' || a.targetType === 'chat'
    ).length;
    const contentActions = this.activities.filter(a =>
      a.action === 'content_engage' || a.action.startsWith('beat_') || a.action === 'story_view' || ['creativity', 'feed', 'story', 'video', 'beat'].includes(a.targetType)
    ).length;
    const socialActions = this.activities.filter(a =>
      a.action === 'match_action' || a.action === 'notification_click' || a.action === 'scroll_depth'
    ).length;

    const total = discoverActions + messagingActions + contentActions + socialActions || 1;
    const discover = Math.min(100, (discoverActions / total) * 200);
    const messaging = Math.min(100, (messagingActions / total) * 200);
    const content = Math.min(100, (contentActions / total) * 200);
    const social = Math.min(100, (socialActions / total) * 200);

    // Active days in last 14
    const twoWeeksAgo = now - 14 * 86400000;
    const activeDateSet = new Set<string>();
    for (const a of this.activities) {
      const d = new Date(a.createdAt);
      if (d.getTime() >= twoWeeksAgo) {
        activeDateSet.add(d.toISOString().slice(0, 10));
      }
    }
    const activeDays14 = activeDateSet.size;

    // Session analysis (group by sessionId or by 30-min gaps)
    const sessions = this.groupIntoSessions();
    const totalSessions = sessions.length;
    const avgSessionDurationMs = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.durationMs, 0) / sessions.length
      : 0;

    // Response metrics (from message_sent/message_read)
    const { avgResponseTimeMs, responseRate } = this.computeResponseMetrics();

    // Overall engagement: weighted formula
    const overall = Math.min(100, Math.round(
      (actionsPerDay * 5) +         // Up to ~50 for 10 actions/day
      (activeDays14 / 14 * 25) +    // Up to 25 for daily active
      (totalSessions > 20 ? 15 : totalSessions / 20 * 15) + // Up to 15
      (responseRate * 10)            // Up to 10 for 100% response
    ));

    return { overall, discover, messaging, content, social, actionsPerDay: Math.round(actionsPerDay * 10) / 10, activeDays14, avgSessionDurationMs: Math.round(avgSessionDurationMs), totalSessions, avgResponseTimeMs: Math.round(avgResponseTimeMs), responseRate };
  }

  private groupIntoSessions(): Array<{ sessionId: string; durationMs: number; actions: number }> {
    // Group by sessionId if available, else by 30-min gap
    const bySession = new Map<string, { start: number; end: number; count: number }>();
    let lastTime = 0;
    let currentSession = `auto_0`;
    let sessionIdx = 0;

    for (const a of this.activities) {
      const meta = this.parseMeta(a);
      const sid = meta.sessionId || a.sessionId;
      const time = new Date(a.createdAt).getTime();

      if (sid) {
        const s = bySession.get(sid) || { start: time, end: time, count: 0 };
        s.start = Math.min(s.start, time);
        s.end = Math.max(s.end, time);
        s.count++;
        bySession.set(sid, s);
      } else {
        // Auto-session by 30-min gap
        if (lastTime > 0 && Math.abs(time - lastTime) > 30 * 60 * 1000) {
          sessionIdx++;
          currentSession = `auto_${sessionIdx}`;
        }
        const s = bySession.get(currentSession) || { start: time, end: time, count: 0 };
        s.start = Math.min(s.start, time);
        s.end = Math.max(s.end, time);
        s.count++;
        bySession.set(currentSession, s);
        lastTime = time;
      }
    }

    return Array.from(bySession.entries()).map(([id, s]) => ({
      sessionId: id,
      durationMs: Math.max(s.end - s.start, 60000), // minimum 1 min
      actions: s.count,
    }));
  }

  private computeResponseMetrics(): { avgResponseTimeMs: number; responseRate: number } {
    const sentMessages = this.filterByAction('message_sent');
    const readMessages = this.filterByAction('message_read');
    const receivedMessages = this.activities.filter(a => a.action === 'message_read' && a.targetType === 'chat');

    const avgResponseTimeMs = sentMessages.length > 0
      ? sentMessages.reduce((sum, m) => {
          const meta = this.parseMeta(m);
          return sum + (meta.responseTimeMs || 60000);
        }, 0) / sentMessages.length
      : 0;

    const responseRate = receivedMessages.length > 0
      ? Math.min(1, sentMessages.length / Math.max(1, receivedMessages.length))
      : 0;

    return { avgResponseTimeMs, responseRate };
  }

  // ═══════════════════════════════════════════════════════
  // 3. BEHAVIORAL CLUSTER
  // ═══════════════════════════════════════════════════════

  determineBehavioralCluster(): BehavioralCluster {
    // Count actions by type
    const actionCounts: Record<string, number> = {};
    for (const a of this.activities) {
      actionCounts[a.action] = (actionCounts[a.action] || 0) + 1;
    }

    const topActions = Object.entries(actionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));

    // Determine active hours
    const hourCounts = new Array(24).fill(0);
    for (const a of this.activities) {
      const hour = new Date(a.createdAt).getHours();
      hourCounts[hour]++;
    }
    const activeHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(h => h.hour);

    // Preferred content types
    const targetTypeCounts: Record<string, number> = {};
    for (const a of this.activities) {
      targetTypeCounts[a.targetType] = (targetTypeCounts[a.targetType] || 0) + 1;
    }
    const preferredContentTypes = Object.entries(targetTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    // Determine cluster type
    const total = this.activities.length || 1;
    const profileActions = (actionCounts['like'] || 0) + (actionCounts['pass'] || 0) + (actionCounts['super_like'] || 0) + (actionCounts['view_profile'] || 0);
    const msgActions = (actionCounts['message_sent'] || 0) + (actionCounts['open_chat'] || 0);
    const contentActions_count = (actionCounts['content_engage'] || 0) + (actionCounts['story_view'] || 0) + (actionCounts['beat_play'] || 0) + (actionCounts['beat_like'] || 0);
    const pageViews = actionCounts['page_view'] || 0;
    const scrolls = actionCounts['scroll_depth'] || 0;

    let type: BehavioralCluster['type'] = 'browser';
    let confidence = 0.5;

    const sessions = this.groupIntoSessions();
    const avgSessionActions = sessions.length > 0
      ? sessions.reduce((s, session) => s + session.actions, 0) / sessions.length
      : 0;

    // Classification rules
    if (total >= 200 && avgSessionActions >= 15) {
      type = 'power-user';
      confidence = Math.min(0.95, 0.6 + avgSessionActions / 100);
    } else if (msgActions / total > 0.3) {
      type = 'communicator';
      confidence = Math.min(0.9, 0.5 + msgActions / total);
    } else if (contentActions_count / total > 0.3) {
      type = 'creator';
      confidence = Math.min(0.9, 0.5 + contentActions_count / total);
    } else if (profileActions / total > 0.4) {
      type = 'engager';
      confidence = Math.min(0.9, 0.5 + profileActions / total);
    } else if (pageViews / total > 0.5 && scrolls / total > 0.1) {
      type = 'browser';
      confidence = 0.6;
    } else if (total < 30) {
      type = 'lurker';
      confidence = Math.min(0.8, 0.5 + (30 - total) / 60);
    }

    return { type, confidence, topActions, activeHours, preferredContentTypes, avgSessionActions: Math.round(avgSessionActions * 10) / 10 };
  }

  // ═══════════════════════════════════════════════════════
  // 4. RESPONSE TIME PROFILE
  // ═══════════════════════════════════════════════════════

  buildResponseTimeProfile(): ResponseTimeProfile {
    const sentMessages = this.filterByAction('message_sent');
    const openChats = this.filterByAction('open_chat');
    const received = this.filterByAction('message_read');

    // Average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    const responseByHour = new Map<number, { total: number; count: number }>();

    for (const m of sentMessages) {
      const meta = this.parseMeta(m);
      if (meta.responseTimeMs) {
        totalResponseTime += meta.responseTimeMs;
        responseCount++;
        const hour = new Date(m.createdAt).getHours();
        const hEntry = responseByHour.get(hour) || { total: 0, count: 0 };
        hEntry.total += meta.responseTimeMs;
        hEntry.count++;
        responseByHour.set(hour, hEntry);
      }
    }

    const avgResponseTimeHrs = responseCount > 0 ? (totalResponseTime / responseCount) / 3600000 : 24;
    const responseRate = received.length > 0 ? Math.min(1, sentMessages.length / Math.max(1, received.length)) : 0;

    const hourlyResponse = new Map<number, number>();
    for (const [hour, data] of responseByHour) {
      hourlyResponse.set(hour, data.total / data.count);
    }

    // Initiation rate: how often user starts conversations vs responds
    const initiationRate = openChats.length > 0 ? Math.min(1, sentMessages.length / Math.max(1, openChats.length)) : 0;

    return { avgResponseTimeHrs, responseRate, responseByHour: hourlyResponse, initiationRate };
  }

  // ═══════════════════════════════════════════════════════
  // 5. CONTENT TASTE PROFILE
  // ═══════════════════════════════════════════════════════

  buildContentTasteProfile(): ContentTasteProfile {
    const categoryScores: Record<string, number> = {};
    const contentTypeScores: Record<string, number> = {};
    const authorScores: Record<string, number> = {};
    let totalDwell = 0;
    let dwellCount = 0;
    const searchTermCounts: Record<string, number> = {};

    for (const a of this.activities) {
      const meta = this.parseMeta(a);

      // Category engagement.
      // Spotlight v1 signals: a Move from a creativity post is the strongest
      // possible content vote (the user wants to date the creator), Beats
      // (action='like' on a creativity item) are vote-tier, Saves are quiet
      // preference, trending interactions get a small backing-winners boost.
      if (meta.category) {
        const isCreativity = a.targetType === 'creativity';
        let weight = 1;
        if (a.action === 'content_engage') {
          weight = meta.engageAction === 'share' ? 5
            : meta.engageAction === 'comment' ? 4
            : meta.engageAction === 'move' ? 6
            : meta.engageAction === 'like' || meta.engageAction === 'beat' ? 3
            : meta.engageAction === 'save' ? 2
            : 1;
        } else if (isCreativity) {
          weight = a.action === 'move' ? 6
            : a.action === 'comment' ? 4
            : a.action === 'share' ? 4
            : a.action === 'like' ? 3
            : a.action === 'save' ? 2
            : a.action === 'view' ? 1
            : 1;
        }
        if (meta.trending && (a.action === 'like' || a.action === 'move')) weight += 1;
        categoryScores[meta.category] = (categoryScores[meta.category] || 0) + weight;
      }

      // Content type
      if (a.targetType && ['creativity', 'feed', 'story', 'video', 'beat'].includes(a.targetType)) {
        contentTypeScores[a.targetType] = (contentTypeScores[a.targetType] || 0) + 1;
      }

      // Author engagement — credit creators the user beats/moves/saves on.
      const authorActionWeight =
        a.action === 'move' ? 6
        : a.action === 'like' && a.targetType === 'creativity' ? 3
        : a.action === 'save' && a.targetType === 'creativity' ? 2
        : a.action === 'content_engage' ? 1
        : 0;
      if (meta.authorId && authorActionWeight > 0) {
        authorScores[meta.authorId] = (authorScores[meta.authorId] || 0) + authorActionWeight;
      }

      // Dwell on content
      if (a.durationMs && ['creativity', 'feed', 'story', 'video'].includes(a.targetType)) {
        totalDwell += a.durationMs;
        dwellCount++;
      }

      // Search terms
      if (a.action === 'search_query' && meta.query) {
        searchTermCounts[meta.query.toLowerCase()] = (searchTermCounts[meta.query.toLowerCase()] || 0) + 1;
      }
      if (a.action === 'search' && meta.query) {
        searchTermCounts[meta.query.toLowerCase()] = (searchTermCounts[meta.query.toLowerCase()] || 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([category, score]) => ({ category, score }));

    const contentTypePrefs = new Map(Object.entries(contentTypeScores));

    const topAuthors = Object.entries(authorScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([authorId, engageCount]) => ({ authorId, engageCount }));

    const avgContentDwellMs = dwellCount > 0 ? Math.round(totalDwell / dwellCount) : 0;

    const searchTerms = Object.entries(searchTermCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([term, count]) => ({ term, count }));

    return { topCategories, contentTypePrefs, topAuthors, avgContentDwellMs, searchTerms };
  }

  // ═══════════════════════════════════════════════════════
  // 6. TEMPORAL PATTERN
  // ═══════════════════════════════════════════════════════

  buildTemporalPattern(): TemporalPattern {
    const hourly = new Array(24).fill(0);
    const daily = new Array(7).fill(0);

    for (const a of this.activities) {
      const d = new Date(a.createdAt);
      hourly[d.getHours()]++;
      daily[d.getDay()]++;
    }

    const peakHours = hourly
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    const peakDays = daily
      .map((count, day) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(d => d.day);

    // Determine primary time slot
    const morning = hourly.slice(6, 12).reduce((s, c) => s + c, 0);   // 6-11
    const afternoon = hourly.slice(12, 17).reduce((s, c) => s + c, 0); // 12-16
    const evening = hourly.slice(17, 22).reduce((s, c) => s + c, 0);   // 17-21
    const night = hourly.slice(22, 24).reduce((s, c) => s + c, 0) + hourly.slice(0, 6).reduce((s, c) => s + c, 0); // 22-5

    const slots = [
      { slot: 'morning' as const, count: morning },
      { slot: 'afternoon' as const, count: afternoon },
      { slot: 'evening' as const, count: evening },
      { slot: 'night' as const, count: night },
    ];
    const primaryTimeSlot = slots.sort((a, b) => b.count - a.count)[0].slot;

    return { hourlyDistribution: hourly, peakHours, dailyDistribution: daily, peakDays, primaryTimeSlot };
  }

  // ═══════════════════════════════════════════════════════
  // FULL ANALYSIS
  // ═══════════════════════════════════════════════════════

  analyze(): FullUserAnalysis {
    return {
      userId: this.userId,
      analyzedAt: new Date(),
      activityCount: this.activities.length,
      preferences: this.buildPreferenceVector(),
      engagement: this.computeEngagementScore(),
      cluster: this.determineBehavioralCluster(),
      responseProfile: this.buildResponseTimeProfile(),
      contentTaste: this.buildContentTasteProfile(),
      temporal: this.buildTemporalPattern(),
    };
  }
}

// ═══════════════════════════════════════════════════════
// SIMILARITY FUNCTIONS (for "similar users like" features)
// ═══════════════════════════════════════════════════════

/** Compute similarity between two users' behavioral clusters (0-1) */
export function clusterSimilarity(a: BehavioralCluster, b: BehavioralCluster): number {
  let score = 0;
  // Same cluster type = high base similarity
  if (a.type === b.type) score += 0.4;

  // Active hours overlap
  const aHours = new Set(a.activeHours);
  const sharedHours = b.activeHours.filter(h => aHours.has(h)).length;
  score += (sharedHours / Math.max(a.activeHours.length, b.activeHours.length, 1)) * 0.3;

  // Content type overlap
  const aTypes = new Set(a.preferredContentTypes);
  const sharedTypes = b.preferredContentTypes.filter(t => aTypes.has(t)).length;
  score += (sharedTypes / Math.max(a.preferredContentTypes.length, b.preferredContentTypes.length, 1)) * 0.3;

  return Math.min(1, score);
}

/** Compute similarity between two users' temporal patterns (0-1) */
export function temporalSimilarity(a: TemporalPattern, b: TemporalPattern): number {
  // Cosine similarity on hourly distributions
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < 24; i++) {
    dot += a.hourlyDistribution[i] * b.hourlyDistribution[i];
    magA += a.hourlyDistribution[i] * a.hourlyDistribution[i];
    magB += b.hourlyDistribution[i] * b.hourlyDistribution[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

/** Compute content taste similarity between two users (0-1) */
export function contentTasteSimilarity(a: ContentTasteProfile, b: ContentTasteProfile): number {
  const aCats = new Set(a.topCategories.map(c => c.category));
  const bCats = new Set(b.topCategories.map(c => c.category));
  let shared = 0;
  for (const cat of aCats) { if (bCats.has(cat)) shared++; }
  const unionSize = new Set([...aCats, ...bCats]).size || 1;
  return shared / unionSize; // Jaccard similarity
}
