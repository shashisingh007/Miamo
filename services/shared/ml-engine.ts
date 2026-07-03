// ═══════════════════════════════════════════════════════════════════════════
// MIAMO ML ENGINE — Real-Time Adaptive Learning System
// ═══════════════════════════════════════════════════════════════════════════
//
// CORE PHILOSOPHY:
// Your profile says "hiking" but this week you've been swiping right on
// musicians. This engine notices that shift in REAL-TIME and adapts.
//
// HOW IT WORKS (5 models working together):
//
// ┌─────────────────────────────────────────────────────────────────┐
// │                    USER ACTION (like, pass, dwell, etc.)        │
// │                              │                                  │
// │    ┌─────────────────────────┼─────────────────────────────┐   │
// │    │                         ▼                             │   │
// │    │  ┌──────────────┐  ┌──────────┐  ┌───────────────┐   │   │
// │    │  │ 1. TEMPORAL  │  │2. SESSION│  │3. PREFERENCE  │   │   │
// │    │  │   WEIGHTS    │  │ CONTEXT  │  │    DRIFT      │   │   │
// │    │  │              │  │          │  │               │   │   │
// │    │  │ "How recent  │  │"What do  │  │"Are interests │   │   │
// │    │  │  was this?"  │  │you want  │  │ changing?"    │   │   │
// │    │  │              │  │RIGHT NOW"│  │               │   │   │
// │    │  └──────┬───────┘  └────┬─────┘  └──────┬────────┘   │   │
// │    │         │               │               │             │   │
// │    │         ▼               ▼               ▼             │   │
// │    │  ┌─────────────────────────────────────────────┐      │   │
// │    │  │       4. ADAPTIVE PREFERENCE MODEL          │      │   │
// │    │  │                                             │      │   │
// │    │  │  Combines all signals into a single         │      │   │
// │    │  │  "what this user wants" score for any       │      │   │
// │    │  │  candidate profile                          │      │   │
// │    │  └─────────────────────┬───────────────────────┘      │   │
// │    │                        │                              │   │
// │    │                        ▼                              │   │
// │    │  ┌─────────────────────────────────────────────┐      │   │
// │    │  │    5. MULTI-ARMED BANDIT (Explore/Exploit)  │      │   │
// │    │  │                                             │      │   │
// │    │  │  Should we show what we KNOW they like?     │      │   │
// │    │  │  Or explore new types to learn more?        │      │   │
// │    │  └─────────────────────────────────────────────┘      │   │
// │    │                                                       │   │
// │    └───────────────────────────────────────────────────────┘   │
// └─────────────────────────────────────────────────────────────────┘
//
// REAL-TIME: No batch training. Every swipe teaches the system instantly.
// FORGETTING: Old preferences decay. You liked coffee 3 months ago but
//             haven't engaged with coffee-lovers since? Weight drops.
// SESSION-AWARE: Just opened the app after a breakup? Swiping differently?
//                The system detects session shift within 5-10 actions.
//
// ═══════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────

/** A single learning signal from a user action */
export interface LearningSignal {
  userId: string;
  action: 'like' | 'pass' | 'super_like' | 'dwell' | 'message' | 'unmatch' | 'match' | 'move' | 'view';
  targetUserId?: string;
  /** Features of the target profile at the time of action */
  targetFeatures: ProfileFeatureVector;
  /** How long the user spent (dwell time) */
  dwellMs?: number;
  /** Session ID for session-awareness */
  sessionId?: string;
  /** Timestamp */
  timestamp: Date;
}

/** Simplified feature vector for any profile (what the ML sees) */
export interface ProfileFeatureVector {
  age?: number;
  city?: string;
  gender?: string;
  interests?: string[];
  intent?: string;         // long-term, casual, friends, etc.
  profession?: string;
  education?: string;
  religion?: string;
  lifestyle?: {
    smoking?: string;
    drinking?: string;
    exercise?: string;
  };
  verified?: boolean;
  profileScore?: number;
  online?: boolean;
  photoCount?: number;
  promptCount?: number;
}

/** Learned preference weights (what the ML produces) */
export interface LearnedPreferences {
  /** Feature weights — how much each feature dimension matters */
  featureWeights: {
    age: { center: number; sigma: number; weight: number };         // Gaussian preference
    cities: Map<string, number>;                                     // city → preference strength
    interests: Map<string, number>;                                  // interest → learned weight
    intents: Map<string, number>;                                    // intent → preference
    professions: Map<string, number>;                                // profession category → pref
    genders: Map<string, number>;                                    // gender → pref
    lifestyle: { smoking: Map<string, number>; drinking: Map<string, number>; exercise: Map<string, number> };
    verified: number;                                                // +/- preference for verified
    photoCount: { min: number; weight: number };                     // photo count preference
  };
  /** Overall confidence (0-1) — how much data we have to trust this */
  confidence: number;
  /** Last updated */
  lastUpdated: Date;
  /** Total signals processed */
  signalCount: number;
}

/** Session context — what does this user want RIGHT NOW */
export interface SessionContext {
  sessionId: string;
  startedAt: Date;
  /** Actions in this session so far */
  actionCount: number;
  /** Like/pass ratio in this session (vs overall) */
  sessionLikeRate: number;
  /** Detected mood shift from normal behavior */
  moodShift: 'exploring' | 'selective' | 'normal' | 'rush';
  /** Features that are trending UP in this session */
  trendingUp: Map<string, number>;    // feature → session boost
  /** Features that are trending DOWN */
  trendingDown: Map<string, number>;  // feature → session penalty
  /** Is user exploring new types? (bandit signal) */
  isExploring: boolean;
}

/** Preference drift — has the user's taste changed? */
export interface PreferenceDrift {
  /** Which interests are rising (recently engaged) */
  risingInterests: Array<{ interest: string; velocity: number; isNew: boolean }>;
  /** Which interests are fading (were active, now declining) */
  fadingInterests: Array<{ interest: string; decay: number }>;
  /** City preference shift */
  cityShift: { from: string; to: string; confidence: number } | null;
  /** Age preference shift */
  ageShift: { direction: 'younger' | 'older' | 'stable'; magnitude: number } | null;
  /** Intent shift */
  intentShift: { from: string; to: string; confidence: number } | null;
  /** Overall drift magnitude (0 = stable, 1 = completely different) */
  driftMagnitude: number;
  /** When was this computed */
  computedAt: Date;
}

/** Multi-Armed Bandit state for explore/exploit decisions */
export interface BanditState {
  /** Arms = profile feature clusters. Each arm tracks: */
  arms: Map<string, {
    /** Times this arm was shown */
    pulls: number;
    /** Times user engaged (like/match/message) */
    rewards: number;
    /** Upper Confidence Bound score */
    ucbScore: number;
    /** Last time this arm was pulled */
    lastPulled: Date;
  }>;
  /** Total pulls across all arms */
  totalPulls: number;
  /** Exploration rate (decays as we learn more) */
  explorationRate: number;
}

// ═══════════════════════════════════════════════════════
// 1. TEMPORAL DECAY — Recent actions matter more
// ═══════════════════════════════════════════════════════
//
// Uses exponential decay: weight = e^(-λ * days_ago)
//   - Action from today: weight ≈ 1.0
//   - Action from 3 days ago: weight ≈ 0.74
//   - Action from 7 days ago: weight ≈ 0.50
//   - Action from 14 days ago: weight ≈ 0.25
//   - Action from 30 days ago: weight ≈ 0.06
//
// This means: if you liked hikers 2 weeks ago but musicians today,
// the musician preference is 4x stronger than the hiker preference.

const DECAY_LAMBDA = 0.05; // Decay rate — tune this: lower = longer memory

export function temporalWeight(actionDate: Date, now: Date = new Date()): number {
  const daysAgo = (now.getTime() - actionDate.getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-DECAY_LAMBDA * daysAgo);
}

/**
 * Compute time-weighted average of a feature preference.
 * More recent signals dominate.
 */
export function timeWeightedAverage(signals: Array<{ value: number; date: Date }>): number {
  if (signals.length === 0) return 0;
  const now = new Date();
  let weightedSum = 0;
  let totalWeight = 0;
  for (const s of signals) {
    const w = temporalWeight(s.date, now);
    weightedSum += s.value * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ═══════════════════════════════════════════════════════
// 2. SESSION CONTEXT DETECTOR
// ═══════════════════════════════════════════════════════
//
// Detects what the user wants RIGHT NOW by analyzing their
// current session behavior vs their historical baseline.
//
// Example: User normally likes 30% of profiles.
//   - This session they're liking 60% → they're in "exploring" mood
//   - This session they're liking 10% → they're being "selective"
//
// Also tracks: which features are they gravitating toward THIS session?
// (e.g., suddenly all likes have "music" interest → boost musicians)

export function detectSessionContext(
  sessionActions: LearningSignal[],
  historicalLikeRate: number,
  historicalPrefs: LearnedPreferences,
): SessionContext {
  if (sessionActions.length === 0) {
    return {
      sessionId: 'default',
      startedAt: new Date(),
      actionCount: 0,
      sessionLikeRate: historicalLikeRate,
      moodShift: 'normal',
      trendingUp: new Map(),
      trendingDown: new Map(),
      isExploring: false,
    };
  }

  const sessionId = sessionActions[0].sessionId || 'default';
  const startedAt = sessionActions[0].timestamp;
  const likes = sessionActions.filter(a => a.action === 'like' || a.action === 'super_like');
  const passes = sessionActions.filter(a => a.action === 'pass');
  const totalDecisions = likes.length + passes.length;
  const sessionLikeRate = totalDecisions > 0 ? likes.length / totalDecisions : historicalLikeRate;

  // Detect mood shift
  let moodShift: SessionContext['moodShift'] = 'normal';
  if (totalDecisions >= 5) {
    if (sessionLikeRate > historicalLikeRate * 1.5) moodShift = 'exploring';
    else if (sessionLikeRate < historicalLikeRate * 0.5) moodShift = 'selective';
    // Rush = many actions in short time, low dwell
    const avgDwell = sessionActions.reduce((s, a) => s + (a.dwellMs || 0), 0) / sessionActions.length;
    if (avgDwell < 2000 && sessionActions.length > 10) moodShift = 'rush';
  }

  // Track feature trends in this session
  const trendingUp = new Map<string, number>();
  const trendingDown = new Map<string, number>();

  // Count features in liked profiles this session
  const sessionFeatureCounts = new Map<string, number>();
  for (const like of likes) {
    const features = like.targetFeatures;
    if (features.interests) {
      for (const interest of features.interests) {
        sessionFeatureCounts.set(`interest:${interest}`, (sessionFeatureCounts.get(`interest:${interest}`) || 0) + 1);
      }
    }
    if (features.city) sessionFeatureCounts.set(`city:${features.city}`, (sessionFeatureCounts.get(`city:${features.city}`) || 0) + 1);
    if (features.intent) sessionFeatureCounts.set(`intent:${features.intent}`, (sessionFeatureCounts.get(`intent:${features.intent}`) || 0) + 1);
    if (features.profession) sessionFeatureCounts.set(`prof:${features.profession}`, (sessionFeatureCounts.get(`prof:${features.profession}`) || 0) + 1);
  }

  // Compare session features to historical baseline
  for (const [feature, count] of sessionFeatureCounts) {
    const sessionRate = count / Math.max(likes.length, 1);
    // Get historical rate for this feature
    const [type, value] = feature.split(':');
    let histRate = 0;
    if (type === 'interest') histRate = (historicalPrefs.featureWeights.interests.get(value) || 0) / Math.max(historicalPrefs.signalCount, 1);
    else if (type === 'city') histRate = (historicalPrefs.featureWeights.cities.get(value) || 0) / Math.max(historicalPrefs.signalCount, 1);
    else if (type === 'intent') histRate = (historicalPrefs.featureWeights.intents.get(value) || 0) / Math.max(historicalPrefs.signalCount, 1);

    // If this session rate is significantly higher than historical → trending up
    if (sessionRate > histRate + 0.15) {
      trendingUp.set(feature, sessionRate - histRate);
    } else if (histRate > sessionRate + 0.15 && count === 0) {
      trendingDown.set(feature, histRate - sessionRate);
    }
  }

  // Exploration detection: are likes going to unusual/diverse profiles?
  const uniqueFeatures = new Set<string>();
  for (const like of likes) {
    if (like.targetFeatures.interests) like.targetFeatures.interests.forEach(i => uniqueFeatures.add(i));
  }
  const isExploring = likes.length >= 3 && (uniqueFeatures.size / Math.max(likes.length, 1)) > 2;

  return { sessionId, startedAt, actionCount: sessionActions.length, sessionLikeRate, moodShift, trendingUp, trendingDown, isExploring };
}

// ═══════════════════════════════════════════════════════
// 3. PREFERENCE DRIFT DETECTION
// ═══════════════════════════════════════════════════════
//
// Compares two time windows:
//   - Recent window (last 3 days)
//   - Historical window (7-30 days ago)
//
// If the features in recent likes differ significantly from
// historical likes, we've detected a "preference drift."
//
// Example:
//   Historical: liked profiles with interests=[hiking, coffee, yoga]
//   Recent:     liked profiles with interests=[music, art, nightlife]
//   → Drift detected! Rising: music, art. Fading: hiking, yoga.
//
// This lets the algorithm prioritize NEW preferences even though
// the user's profile still says "hiking."

export function detectPreferenceDrift(
  allSignals: LearningSignal[],
  recentWindowDays: number = 3,
  historicalWindowDays: number = 30,
): PreferenceDrift {
  const now = new Date();
  const recentCutoff = new Date(now.getTime() - recentWindowDays * 86400000);
  const historicalStart = new Date(now.getTime() - historicalWindowDays * 86400000);

  // Split signals into recent and historical
  const recentLikes = allSignals.filter(s =>
    (s.action === 'like' || s.action === 'super_like') && s.timestamp >= recentCutoff
  );
  const historicalLikes = allSignals.filter(s =>
    (s.action === 'like' || s.action === 'super_like') && s.timestamp >= historicalStart && s.timestamp < recentCutoff
  );

  // Count interests in each window
  const recentInterestCounts = new Map<string, number>();
  const historicalInterestCounts = new Map<string, number>();

  for (const like of recentLikes) {
    if (like.targetFeatures.interests) {
      for (const interest of like.targetFeatures.interests) {
        recentInterestCounts.set(interest, (recentInterestCounts.get(interest) || 0) + 1);
      }
    }
  }
  for (const like of historicalLikes) {
    if (like.targetFeatures.interests) {
      for (const interest of like.targetFeatures.interests) {
        historicalInterestCounts.set(interest, (historicalInterestCounts.get(interest) || 0) + 1);
      }
    }
  }

  // Normalize to rates
  const recentTotal = Math.max(recentLikes.length, 1);
  const histTotal = Math.max(historicalLikes.length, 1);

  // Detect rising interests (high in recent, low/absent in historical)
  const risingInterests: PreferenceDrift['risingInterests'] = [];
  for (const [interest, count] of recentInterestCounts) {
    const recentRate = count / recentTotal;
    const histRate = (historicalInterestCounts.get(interest) || 0) / histTotal;
    const velocity = recentRate - histRate;
    if (velocity > 0.1 || (histRate === 0 && count >= 2)) {
      risingInterests.push({ interest, velocity, isNew: histRate === 0 });
    }
  }

  // Detect fading interests (high in historical, low/absent in recent)
  const fadingInterests: PreferenceDrift['fadingInterests'] = [];
  for (const [interest, count] of historicalInterestCounts) {
    const histRate = count / histTotal;
    const recentRate = (recentInterestCounts.get(interest) || 0) / recentTotal;
    if (histRate - recentRate > 0.15 && histRate > 0.1) {
      fadingInterests.push({ interest, decay: histRate - recentRate });
    }
  }

  // Detect age shift
  const recentAges = recentLikes.map(l => l.targetFeatures.age).filter(Boolean) as number[];
  const historicalAges = historicalLikes.map(l => l.targetFeatures.age).filter(Boolean) as number[];
  let ageShift: PreferenceDrift['ageShift'] = null;
  if (recentAges.length >= 3 && historicalAges.length >= 3) {
    const recentAvg = recentAges.reduce((s, a) => s + a, 0) / recentAges.length;
    const histAvg = historicalAges.reduce((s, a) => s + a, 0) / historicalAges.length;
    const diff = recentAvg - histAvg;
    if (Math.abs(diff) > 2) {
      ageShift = { direction: diff > 0 ? 'older' : 'younger', magnitude: Math.abs(diff) };
    }
  }

  // Detect city shift
  const recentCities = recentLikes.map(l => l.targetFeatures.city).filter(Boolean) as string[];
  const historicalCities = historicalLikes.map(l => l.targetFeatures.city).filter(Boolean) as string[];
  let cityShift: PreferenceDrift['cityShift'] = null;
  if (recentCities.length >= 3) {
    const topRecent = mode(recentCities);
    const topHist = historicalCities.length > 0 ? mode(historicalCities) : topRecent;
    if (topRecent !== topHist) {
      const confidence = recentCities.filter(c => c === topRecent).length / recentCities.length;
      if (confidence > 0.4) cityShift = { from: topHist, to: topRecent, confidence };
    }
  }

  // Detect intent shift
  const recentIntents = recentLikes.map(l => l.targetFeatures.intent).filter(Boolean) as string[];
  const histIntents = historicalLikes.map(l => l.targetFeatures.intent).filter(Boolean) as string[];
  let intentShift: PreferenceDrift['intentShift'] = null;
  if (recentIntents.length >= 3 && histIntents.length >= 3) {
    const topRecent = mode(recentIntents);
    const topHist = mode(histIntents);
    if (topRecent !== topHist) {
      const confidence = recentIntents.filter(i => i === topRecent).length / recentIntents.length;
      if (confidence > 0.4) intentShift = { from: topHist, to: topRecent, confidence };
    }
  }

  // Overall drift magnitude (0-1)
  let driftMagnitude = 0;
  driftMagnitude += risingInterests.length * 0.1;
  driftMagnitude += fadingInterests.length * 0.05;
  if (ageShift) driftMagnitude += Math.min(ageShift.magnitude / 10, 0.2);
  if (cityShift) driftMagnitude += cityShift.confidence * 0.2;
  if (intentShift) driftMagnitude += intentShift.confidence * 0.3;
  driftMagnitude = Math.min(driftMagnitude, 1);

  return { risingInterests, fadingInterests, cityShift, ageShift, intentShift, driftMagnitude, computedAt: now };
}

// ═══════════════════════════════════════════════════════
// 4. ADAPTIVE PREFERENCE MODEL (Online Learning)
// ═══════════════════════════════════════════════════════
//
// This is the core "brain." It maintains a learned preference
// model that updates with every user action.
//
// LEARNING RATE:
//   - Likes: +1.0 (strong positive signal)
//   - Super Likes: +2.0 (very strong positive)
//   - Long Dwell (>10s): +0.3 (mild interest)
//   - Pass: -0.3 (mild negative — they still SAW the profile)
//   - Unmatch: -1.5 (strong negative — it didn't work out)
//   - Message sent: +0.5 (engagement)
//   - Match formed: +1.5 (confirmed mutual interest)
//
// Each feature of the liked/passed profile gets its signal
// multiplied by the temporal weight of that action.

const SIGNAL_WEIGHTS: Record<string, number> = {
  like: 1.0,
  super_like: 2.0,
  dwell: 0.3,       // only if dwellMs > 10000
  pass: -0.3,
  unmatch: -1.5,
  message: 0.5,
  match: 1.5,
  move: 0.8,
  view: 0.0,        // neutral — just looking
};

/**
 * Process a batch of learning signals and produce updated preferences.
 * This is the core "training" function — called after every user action.
 *
 * Think of it like gradient descent, but simpler:
 *   For each feature of the profile the user interacted with:
 *     preference[feature] += learning_rate * signal_strength * temporal_weight
 */
export function learnFromSignals(
  existingPrefs: LearnedPreferences | null,
  signals: LearningSignal[],
): LearnedPreferences {
  // Initialize if first time
  const prefs: LearnedPreferences = existingPrefs || {
    featureWeights: {
      age: { center: 25, sigma: 5, weight: 0 },
      cities: new Map(),
      interests: new Map(),
      intents: new Map(),
      professions: new Map(),
      genders: new Map(),
      lifestyle: { smoking: new Map(), drinking: new Map(), exercise: new Map() },
      verified: 0,
      photoCount: { min: 1, weight: 0 },
    },
    confidence: 0,
    lastUpdated: new Date(),
    signalCount: 0,
  };

  const now = new Date();
  const LEARNING_RATE = 0.1; // How fast we update (0.1 = moderate, 0.3 = aggressive)

  for (const signal of signals) {
    const strength = SIGNAL_WEIGHTS[signal.action] || 0;
    if (strength === 0 && signal.action !== 'dwell') continue;

    // For dwell, only count if they spent meaningful time (>10s)
    if (signal.action === 'dwell' && (!signal.dwellMs || signal.dwellMs < 10000)) continue;

    const timeWeight = temporalWeight(signal.timestamp, now);
    const update = LEARNING_RATE * strength * timeWeight;

    const features = signal.targetFeatures;

    // Update age preference (Gaussian model)
    if (features.age) {
      // Moving average toward liked ages, away from passed ages
      const w = prefs.featureWeights.age;
      w.weight += Math.abs(update);
      if (update > 0) {
        // Attract center toward this age
        w.center += (features.age - w.center) * Math.abs(update) * 0.1;
        // Tighten sigma if consistently liking same age range
        w.sigma = Math.max(2, w.sigma - Math.abs(update) * 0.05);
      } else {
        // Widen sigma (less sure about age pref)
        w.sigma = Math.min(15, w.sigma + Math.abs(update) * 0.02);
      }
    }

    // Update interest preferences
    if (features.interests) {
      for (const interest of features.interests) {
        const current = prefs.featureWeights.interests.get(interest) || 0;
        prefs.featureWeights.interests.set(interest, current + update);
      }
    }

    // Update city preferences
    if (features.city) {
      const current = prefs.featureWeights.cities.get(features.city) || 0;
      prefs.featureWeights.cities.set(features.city, current + update);
    }

    // Update intent preferences
    if (features.intent) {
      const current = prefs.featureWeights.intents.get(features.intent) || 0;
      prefs.featureWeights.intents.set(features.intent, current + update);
    }

    // Update profession preferences
    if (features.profession) {
      const cat = professionCategory(features.profession);
      const current = prefs.featureWeights.professions.get(cat) || 0;
      prefs.featureWeights.professions.set(cat, current + update);
    }

    // Update gender preferences
    if (features.gender) {
      const current = prefs.featureWeights.genders.get(features.gender) || 0;
      prefs.featureWeights.genders.set(features.gender, current + update);
    }

    // Update lifestyle preferences
    if (features.lifestyle) {
      if (features.lifestyle.smoking) {
        const cur = prefs.featureWeights.lifestyle.smoking.get(features.lifestyle.smoking) || 0;
        prefs.featureWeights.lifestyle.smoking.set(features.lifestyle.smoking, cur + update);
      }
      if (features.lifestyle.drinking) {
        const cur = prefs.featureWeights.lifestyle.drinking.get(features.lifestyle.drinking) || 0;
        prefs.featureWeights.lifestyle.drinking.set(features.lifestyle.drinking, cur + update);
      }
      if (features.lifestyle.exercise) {
        const cur = prefs.featureWeights.lifestyle.exercise.get(features.lifestyle.exercise) || 0;
        prefs.featureWeights.lifestyle.exercise.set(features.lifestyle.exercise, cur + update);
      }
    }

    // Verified preference
    if (features.verified !== undefined) {
      prefs.featureWeights.verified += features.verified ? update : -update * 0.5;
    }

    // Photo count preference
    if (features.photoCount) {
      if (update > 0 && features.photoCount >= 3) {
        prefs.featureWeights.photoCount.weight += update;
        prefs.featureWeights.photoCount.min = Math.max(prefs.featureWeights.photoCount.min,
          features.photoCount - 1);
      }
    }

    prefs.signalCount++;
  }

  // Update confidence (saturates at 1.0 around ~100 signals)
  prefs.confidence = Math.min(1, prefs.signalCount / 100);
  prefs.lastUpdated = now;

  // Apply global decay to all weights (prevents unbounded growth)
  applyGlobalDecay(prefs);

  return prefs;
}

/**
 * Decay all weights slightly to prevent runaway values and allow
 * old preferences to fade naturally.
 *
 * Applied once per learning cycle (not per signal).
 * Multiplies all weights by 0.995 — effectively a 0.5% decay per cycle.
 */
function applyGlobalDecay(prefs: LearnedPreferences): void {
  const DECAY = 0.995;
  for (const [k, v] of prefs.featureWeights.interests) {
    prefs.featureWeights.interests.set(k, v * DECAY);
    if (Math.abs(v * DECAY) < 0.01) prefs.featureWeights.interests.delete(k);
  }
  for (const [k, v] of prefs.featureWeights.cities) {
    prefs.featureWeights.cities.set(k, v * DECAY);
    if (Math.abs(v * DECAY) < 0.01) prefs.featureWeights.cities.delete(k);
  }
  for (const [k, v] of prefs.featureWeights.intents) {
    prefs.featureWeights.intents.set(k, v * DECAY);
  }
  prefs.featureWeights.verified *= DECAY;
}

// ═══════════════════════════════════════════════════════
// 5. MULTI-ARMED BANDIT (Explore/Exploit)
// ═══════════════════════════════════════════════════════
//
// Problem: If we always show what the model thinks you'll like,
// we'll never discover NEW preferences. This is the "filter bubble."
//
// Solution: UCB1 (Upper Confidence Bound) algorithm.
//
// We define "arms" as profile clusters (e.g., "sporty-mumbai-25",
// "creative-delhi-28"). Each arm has:
//   - pulls: how many times we showed this type
//   - rewards: how many times user engaged (like/match)
//
// UCB1 score = (rewards/pulls) + C * sqrt(ln(totalPulls) / pulls)
//
// First term = "exploit" (show what worked before)
// Second term = "explore" (boost under-sampled arms)
//
// Early on: explore a lot (we don't know preferences yet)
// Later: mostly exploit (we're confident), with occasional exploration

const UCB_C = 1.5; // Exploration constant (higher = more exploration)

export function initBanditState(): BanditState {
  return { arms: new Map(), totalPulls: 0, explorationRate: 0.3 };
}

/**
 * Get the arm (cluster) label for a profile.
 * Clusters by: primary interest category + city type + age bracket.
 */
export function getProfileArm(features: ProfileFeatureVector): string {
  const ageBracket = features.age ? (features.age < 25 ? 'young' : features.age < 30 ? 'mid' : features.age < 35 ? 'thirties' : 'mature') : 'unknown';
  const topInterest = features.interests?.[0]?.toLowerCase() || 'general';
  const interestCat = interestToCategory(topInterest);
  return `${interestCat}-${ageBracket}`;
}

/**
 * Compute UCB1 score for each arm. Higher = should be shown next.
 */
export function computeUCBScores(state: BanditState): Map<string, number> {
  const scores = new Map<string, number>();
  const lnTotal = Math.log(Math.max(state.totalPulls, 1));

  for (const [arm, data] of state.arms) {
    const exploitation = data.pulls > 0 ? data.rewards / data.pulls : 0;
    const exploration = data.pulls > 0 ? UCB_C * Math.sqrt(lnTotal / data.pulls) : Infinity;
    scores.set(arm, exploitation + exploration);
    data.ucbScore = exploitation + exploration;
  }
  return scores;
}

/**
 * Update bandit state after a user action.
 */
export function updateBandit(state: BanditState, arm: string, rewarded: boolean): BanditState {
  if (!state.arms.has(arm)) {
    state.arms.set(arm, { pulls: 0, rewards: 0, ucbScore: 0, lastPulled: new Date() });
  }
  const armData = state.arms.get(arm)!;
  armData.pulls++;
  if (rewarded) armData.rewards++;
  armData.lastPulled = new Date();
  state.totalPulls++;

  // Decay exploration rate as we learn more
  state.explorationRate = Math.max(0.05, 0.3 * Math.exp(-state.totalPulls / 200));

  return state;
}

// ═══════════════════════════════════════════════════════
// 6. MASTER SCORING FUNCTION — Combines all ML signals
// ═══════════════════════════════════════════════════════
//
// This is what the discover algorithm calls for each candidate.
// It combines:
//   - Learned preferences (long-term taste)
//   - Session context (current mood)
//   - Preference drift (adapting to changes)
//   - Bandit bonus (exploration value)
//
// Returns a 0-30 ML bonus that gets ADDED to the base algorithm score.
// Why 0-30? The base algorithms score 0-100. Adding up to 30 lets ML
// meaningfully influence ranking without completely overriding the base.

export function computeMLScore(
  candidate: ProfileFeatureVector,
  prefs: LearnedPreferences,
  session: SessionContext,
  drift: PreferenceDrift,
  banditState: BanditState,
): { mlScore: number; breakdown: MLBreakdown } {
  let score = 0;
  const breakdown: MLBreakdown = { learned: 0, session: 0, drift: 0, exploration: 0 };

  // ── A) Learned Preference Match (0-15) ──
  // How well does this candidate match what we've LEARNED (not profile-stated)?
  let learnedScore = 0;

  // Age fit (Gaussian)
  if (candidate.age && prefs.featureWeights.age.weight > 0) {
    const ageDist = Math.abs(candidate.age - prefs.featureWeights.age.center);
    const sigma = prefs.featureWeights.age.sigma;
    const ageFit = Math.exp(-(ageDist * ageDist) / (2 * sigma * sigma));
    learnedScore += ageFit * 4; // 0-4 points
  }

  // Interest match (IDF-weighted by learned preference)
  if (candidate.interests) {
    let interestMatch = 0;
    for (const interest of candidate.interests) {
      const weight = prefs.featureWeights.interests.get(interest) || 0;
      if (weight > 0) interestMatch += Math.min(weight, 2); // Cap per interest
    }
    learnedScore += Math.min(interestMatch, 5); // 0-5 points
  }

  // City match
  if (candidate.city) {
    const cityWeight = prefs.featureWeights.cities.get(candidate.city) || 0;
    if (cityWeight > 0) learnedScore += Math.min(cityWeight * 2, 3); // 0-3 points
  }

  // Intent match
  if (candidate.intent) {
    const intentWeight = prefs.featureWeights.intents.get(candidate.intent) || 0;
    if (intentWeight > 0) learnedScore += Math.min(intentWeight * 2, 3); // 0-3 points
  }

  // Scale by confidence (if we have few signals, don't trust this much)
  learnedScore *= prefs.confidence;
  learnedScore = Math.min(learnedScore, 15);
  breakdown.learned = Math.round(learnedScore * 10) / 10;
  score += learnedScore;

  // ── B) Session Context Boost (0-8) ──
  // If this candidate matches what the user is gravitating toward THIS session
  let sessionScore = 0;

  if (session.actionCount >= 5) {
    // Check if candidate features match session trends
    if (candidate.interests) {
      for (const interest of candidate.interests) {
        const boost = session.trendingUp.get(`interest:${interest}`) || 0;
        if (boost > 0) sessionScore += boost * 3;
        const penalty = session.trendingDown.get(`interest:${interest}`) || 0;
        if (penalty > 0) sessionScore -= penalty * 1.5;
      }
    }
    if (candidate.city) {
      const cityBoost = session.trendingUp.get(`city:${candidate.city}`) || 0;
      if (cityBoost > 0) sessionScore += cityBoost * 2;
    }
    if (candidate.intent) {
      const intentBoost = session.trendingUp.get(`intent:${candidate.intent}`) || 0;
      if (intentBoost > 0) sessionScore += intentBoost * 2;
    }

    // Mood-based adjustment
    if (session.moodShift === 'selective') sessionScore *= 1.5; // Amplify learned prefs
    if (session.moodShift === 'exploring') sessionScore *= 0.5; // Dampen — let exploration happen
  }

  sessionScore = clamp(sessionScore, -3, 8);
  breakdown.session = Math.round(sessionScore * 10) / 10;
  score += sessionScore;

  // ── C) Preference Drift Bonus (0-5) ──
  // Boost profiles that match RISING interests, penalize FADING ones
  let driftScore = 0;

  if (drift.driftMagnitude > 0.1 && candidate.interests) {
    for (const rising of drift.risingInterests) {
      if (candidate.interests.includes(rising.interest)) {
        driftScore += rising.isNew ? 2 : 1.5; // New interests get more boost
      }
    }
    for (const fading of drift.fadingInterests) {
      if (candidate.interests.includes(fading.interest)) {
        driftScore -= fading.decay * 0.5; // Mild penalty for fading interests
      }
    }

    // Age drift boost
    if (drift.ageShift && candidate.age) {
      if (drift.ageShift.direction === 'younger' && candidate.age < prefs.featureWeights.age.center) driftScore += 1;
      if (drift.ageShift.direction === 'older' && candidate.age > prefs.featureWeights.age.center) driftScore += 1;
    }

    // City drift boost
    if (drift.cityShift && candidate.city === drift.cityShift.to) {
      driftScore += drift.cityShift.confidence * 2;
    }
  }

  driftScore = clamp(driftScore, -2, 5);
  breakdown.drift = Math.round(driftScore * 10) / 10;
  score += driftScore;

  // ── D) Exploration Bonus (0-5) ──
  // Profiles from under-explored clusters get a boost
  const arm = getProfileArm(candidate);
  const armData = banditState.arms.get(arm);

  let explorationBonus = 0;
  if (!armData || armData.pulls < 3) {
    // Never/barely shown this type → high exploration value
    explorationBonus = 4 * banditState.explorationRate;
  } else {
    // UCB1 formula component
    const ucbScores = computeUCBScores(banditState);
    const ucb = ucbScores.get(arm) || 0;
    const maxUcb = Math.max(...Array.from(ucbScores.values()));
    if (maxUcb > 0) {
      explorationBonus = (ucb / maxUcb) * 3 * banditState.explorationRate;
    }
  }

  explorationBonus = clamp(explorationBonus, 0, 5);
  breakdown.exploration = Math.round(explorationBonus * 10) / 10;
  score += explorationBonus;

  return { mlScore: clamp(Math.round(score * 10) / 10, 0, 30), breakdown };
}

export interface MLBreakdown {
  /** Score from long-term learned preferences (0-15) */
  learned: number;
  /** Score from current session behavior (0-8) */
  session: number;
  /** Score from preference drift detection (0-5) */
  drift: number;
  /** Score from exploration bonus (0-5) */
  exploration: number;
}

// ═══════════════════════════════════════════════════════
// 7. COLLABORATIVE FILTERING — "Users like you also liked"
// ═══════════════════════════════════════════════════════
//
// Finds users with similar behavior patterns and recommends
// profiles that those similar users liked (but you haven't seen).
//
// Similarity metric: Jaccard similarity on liked profile sets.
//
// This is powerful because it can discover non-obvious connections:
//   "Users who like both hiking AND jazz also tend to like yoga"
//   → Recommends yoga profiles even if you never stated that interest.

export interface UserSimilarity {
  userId: string;
  similarity: number;  // 0-1 Jaccard coefficient
  likedProfiles: Set<string>;
}

/**
 * Find the top-K most similar users based on like overlap.
 * Returns profiles they liked that the current user hasn't seen.
 */
export function collaborativeRecommendations(
  myLikedIds: Set<string>,
  otherUsers: Array<{ userId: string; likedIds: Set<string> }>,
  alreadySeen: Set<string>,
  topK: number = 5,
): Array<{ profileId: string; score: number; recommendedBy: number }> {
  // Compute Jaccard similarity with each other user
  const similarities: UserSimilarity[] = [];
  for (const other of otherUsers) {
    if (other.likedIds.size < 3) continue; // Not enough data
    const intersection = new Set([...myLikedIds].filter(x => other.likedIds.has(x)));
    const union = new Set([...myLikedIds, ...other.likedIds]);
    const jaccard = union.size > 0 ? intersection.size / union.size : 0;
    if (jaccard > 0.1) { // At least 10% overlap
      similarities.push({ userId: other.userId, similarity: jaccard, likedProfiles: other.likedIds });
    }
  }

  // Sort by similarity (most similar first)
  similarities.sort((a, b) => b.similarity - a.similarity);
  const topSimilar = similarities.slice(0, topK);

  // Aggregate profile recommendations from similar users
  const profileScores = new Map<string, { score: number; count: number }>();
  for (const sim of topSimilar) {
    for (const profileId of sim.likedProfiles) {
      // Only recommend profiles the user hasn't already seen
      if (myLikedIds.has(profileId) || alreadySeen.has(profileId)) continue;
      const existing = profileScores.get(profileId) || { score: 0, count: 0 };
      existing.score += sim.similarity; // Weighted by how similar this user is
      existing.count += 1;
      profileScores.set(profileId, existing);
    }
  }

  // Return sorted by total similarity score
  return Array.from(profileScores.entries())
    .map(([profileId, { score, count }]) => ({ profileId, score, recommendedBy: count }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ═══════════════════════════════════════════════════════
// 8. SERIALIZATION — Persist ML state to database
// ═══════════════════════════════════════════════════════
//
// The learned preferences and bandit state need to persist
// across sessions. We serialize to JSON and store in UserData.

export function serializeLearnedPrefs(prefs: LearnedPreferences): string {
  return JSON.stringify({
    featureWeights: {
      age: prefs.featureWeights.age,
      cities: Object.fromEntries(prefs.featureWeights.cities),
      interests: Object.fromEntries(prefs.featureWeights.interests),
      intents: Object.fromEntries(prefs.featureWeights.intents),
      professions: Object.fromEntries(prefs.featureWeights.professions),
      genders: Object.fromEntries(prefs.featureWeights.genders),
      lifestyle: {
        smoking: Object.fromEntries(prefs.featureWeights.lifestyle.smoking),
        drinking: Object.fromEntries(prefs.featureWeights.lifestyle.drinking),
        exercise: Object.fromEntries(prefs.featureWeights.lifestyle.exercise),
      },
      verified: prefs.featureWeights.verified,
      photoCount: prefs.featureWeights.photoCount,
    },
    confidence: prefs.confidence,
    lastUpdated: prefs.lastUpdated.toISOString(),
    signalCount: prefs.signalCount,
  });
}

export function deserializeLearnedPrefs(json: string): LearnedPreferences | null {
  try {
    const d = JSON.parse(json);
    return {
      featureWeights: {
        age: d.featureWeights.age,
        cities: new Map(Object.entries(d.featureWeights.cities || {})),
        interests: new Map(Object.entries(d.featureWeights.interests || {})),
        intents: new Map(Object.entries(d.featureWeights.intents || {})),
        professions: new Map(Object.entries(d.featureWeights.professions || {})),
        genders: new Map(Object.entries(d.featureWeights.genders || {})),
        lifestyle: {
          smoking: new Map(Object.entries(d.featureWeights.lifestyle?.smoking || {})),
          drinking: new Map(Object.entries(d.featureWeights.lifestyle?.drinking || {})),
          exercise: new Map(Object.entries(d.featureWeights.lifestyle?.exercise || {})),
        },
        verified: d.featureWeights.verified || 0,
        photoCount: d.featureWeights.photoCount || { min: 1, weight: 0 },
      },
      confidence: d.confidence || 0,
      lastUpdated: new Date(d.lastUpdated),
      signalCount: d.signalCount || 0,
    };
  } catch { return null; }
}

export function serializeBanditState(state: BanditState): string {
  return JSON.stringify({
    arms: Object.fromEntries(
      Array.from(state.arms.entries()).map(([k, v]) => [k, { ...v, lastPulled: v.lastPulled.toISOString() }])
    ),
    totalPulls: state.totalPulls,
    explorationRate: state.explorationRate,
  });
}

export function deserializeBanditState(json: string): BanditState | null {
  try {
    const d = JSON.parse(json);
    const arms = new Map<string, any>();
    for (const [k, v] of Object.entries(d.arms || {})) {
      const arm = v as any;
      arms.set(k, { ...arm, lastPulled: new Date(arm.lastPulled) });
    }
    return { arms, totalPulls: d.totalPulls || 0, explorationRate: d.explorationRate || 0.3 };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function mode(arr: string[]): string {
  const counts = new Map<string, number>();
  for (const item of arr) counts.set(item, (counts.get(item) || 0) + 1);
  let max = 0, result = arr[0];
  for (const [item, count] of counts) {
    if (count > max) { max = count; result = item; }
  }
  return result;
}

/** Map profession to broad category for clustering */
function professionCategory(profession: string): string {
  const p = profession.toLowerCase();
  if (/engineer|developer|software|tech|data|ai|ml|dev/.test(p)) return 'tech';
  if (/doctor|nurse|medical|health|pharma/.test(p)) return 'medical';
  if (/design|creative|art|music|photo|film|write/.test(p)) return 'creative';
  if (/business|finance|bank|consult|market|sales/.test(p)) return 'business';
  if (/teach|professor|education|academ/.test(p)) return 'education';
  if (/law|legal|advocate/.test(p)) return 'legal';
  if (/sport|fitness|coach|athlet/.test(p)) return 'sports';
  if (/food|chef|restaurant|hotel|hospitality/.test(p)) return 'hospitality';
  return 'other';
}

/** Map interest to broad category for bandit arms */
function interestToCategory(interest: string): string {
  const i = interest.toLowerCase();
  if (/sport|gym|fitness|yoga|hiking|run|swim|climb/.test(i)) return 'active';
  if (/music|sing|guitar|piano|drum|dj/.test(i)) return 'music';
  if (/art|paint|draw|design|photo|film/.test(i)) return 'creative';
  if (/cook|food|bak|coffee|wine|beer/.test(i)) return 'food';
  if (/read|book|write|poetry|blog/.test(i)) return 'literary';
  if (/travel|adventure|explore|backpack/.test(i)) return 'travel';
  if (/tech|code|game|anime|sci-fi/.test(i)) return 'tech';
  if (/nature|garden|pet|animal|plant/.test(i)) return 'nature';
  if (/social|party|dance|club|bar/.test(i)) return 'social';
  return 'general';
}
