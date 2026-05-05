// ─── AI Match Routes ─────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const aiMatchRouter = Router();

// ─── Helper: compute detailed compatibility ─────────
function computeCompatibility(
  myProfile: any,
  myInterestNames: string[],
  candidate: any,
) {
  const cProfile = candidate.profile;
  const cInterests = candidate.interests?.map((i: any) => i.name) || [];
  const common = cInterests.filter((i: string) => myInterestNames.includes(i));

  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];
  const breakdown: Record<string, number> = {};

  // 1. Common interests (0-25)
  const interestScore = Math.min(common.length * 5, 25);
  score += interestScore;
  breakdown.interests = interestScore;
  if (common.length >= 3) reasons.push(`${common.length} shared interests: ${common.slice(0, 3).join(', ')}`);
  else if (common.length > 0) reasons.push(`Both enjoy ${common[0]}`);

  if (myProfile && cProfile) {
    // 2. Dating intent compatibility (0-20)
    if (myProfile.datingIntent === cProfile.datingIntent) {
      score += 20;
      breakdown.datingIntent = 20;
      reasons.push('Same dating goals');
    } else if (myProfile.seriousMode === cProfile.seriousMode) {
      score += 10;
      breakdown.datingIntent = 10;
      reasons.push('Similar relationship mindset');
    } else {
      breakdown.datingIntent = 0;
    }

    // 3. City match (0-10)
    if (myProfile.city?.toLowerCase() === cProfile.city?.toLowerCase()) {
      score += 10;
      breakdown.location = 10;
      reasons.push(`Both in ${cProfile.city}`);
    } else {
      breakdown.location = 0;
    }

    // 4. Age compatibility (0-10)
    const ageDiff = Math.abs(myProfile.age - cProfile.age);
    if (ageDiff <= 3) {
      score += 10;
      breakdown.age = 10;
      reasons.push('Similar age range');
    } else if (ageDiff <= 7) {
      score += 5;
      breakdown.age = 5;
    } else {
      breakdown.age = 0;
      concerns.push('Significant age difference');
    }

    // 5. Lifestyle compatibility (0-15)
    let lifestyleScore = 0;
    if (myProfile.smoking === cProfile.smoking) lifestyleScore += 5;
    if (myProfile.drinking === cProfile.drinking) lifestyleScore += 5;
    if (myProfile.exercise === cProfile.exercise) lifestyleScore += 5;
    score += lifestyleScore;
    breakdown.lifestyle = lifestyleScore;
    if (lifestyleScore >= 10) reasons.push('Compatible lifestyle habits');

    // 6. Values compatibility (0-10)
    let valuesScore = 0;
    if (myProfile.children && cProfile.children && myProfile.children === cProfile.children) valuesScore += 5;
    if (myProfile.religion && cProfile.religion && myProfile.religion === cProfile.religion) valuesScore += 5;
    score += valuesScore;
    breakdown.values = valuesScore;
    if (valuesScore >= 5) reasons.push('Aligned values and life goals');

    // 7. Profile completeness (0-10)
    if (cProfile.profileScore >= 80) {
      score += 10;
      breakdown.profileQuality = 10;
      reasons.push('Highly detailed profile');
    } else if (cProfile.profileScore >= 60) {
      score += 5;
      breakdown.profileQuality = 5;
    } else {
      breakdown.profileQuality = 0;
    }

    // 8. Verification bonus (0-5)
    if (candidate.verified) {
      score += 5;
      breakdown.verification = 5;
    } else {
      breakdown.verification = 0;
    }

    // 9. Activity (0-10)
    if (cProfile.online) {
      score += 10;
      breakdown.activity = 10;
      reasons.push('Currently active');
    } else if (cProfile.lastActive && (Date.now() - new Date(cProfile.lastActive).getTime()) < 86400000) {
      score += 5;
      breakdown.activity = 5;
    } else {
      breakdown.activity = 0;
    }

    // 10. Zodiac compatibility (0-5 bonus)
    const zodiacCompatible: Record<string, string[]> = {
      Aries: ['Leo', 'Sagittarius', 'Gemini', 'Aquarius'],
      Taurus: ['Virgo', 'Capricorn', 'Cancer', 'Pisces'],
      Gemini: ['Libra', 'Aquarius', 'Aries', 'Leo'],
      Cancer: ['Scorpio', 'Pisces', 'Taurus', 'Virgo'],
      Leo: ['Aries', 'Sagittarius', 'Gemini', 'Libra'],
      Virgo: ['Taurus', 'Capricorn', 'Cancer', 'Scorpio'],
      Libra: ['Gemini', 'Aquarius', 'Leo', 'Sagittarius'],
      Scorpio: ['Cancer', 'Pisces', 'Virgo', 'Capricorn'],
      Sagittarius: ['Aries', 'Leo', 'Libra', 'Aquarius'],
      Capricorn: ['Taurus', 'Virgo', 'Scorpio', 'Pisces'],
      Aquarius: ['Gemini', 'Libra', 'Aries', 'Sagittarius'],
      Pisces: ['Cancer', 'Scorpio', 'Taurus', 'Capricorn'],
    };
    if (myProfile.zodiac && cProfile.zodiac && zodiacCompatible[myProfile.zodiac]?.includes(cProfile.zodiac)) {
      score += 5;
      breakdown.zodiac = 5;
    }
  }

  score = Math.min(score, 100);

  return { score, reasons: reasons.slice(0, 5), concerns: concerns.slice(0, 3), common, breakdown };
}

// ─── "Why This Match" — 3 algorithmic reasons ───────
function generateWhyThisMatch(
  myProfile: any,
  myInterestNames: string[],
  candidate: any,
): string[] {
  const cProfile = candidate.profile;
  const cInterests = candidate.interests?.map((i: any) => i.name) || [];
  const common = cInterests.filter((i: string) => myInterestNames.includes(i));
  const whyPoints: { text: string; weight: number }[] = [];

  if (!cProfile || !myProfile) return ['Interesting profile to explore'];

  // Interest-based reasons
  if (common.length >= 3) {
    whyPoints.push({
      text: `You both love ${common.slice(0, 3).join(', ')} — ${common.length} interests in common means great conversation potential`,
      weight: common.length * 3,
    });
  } else if (common.length > 0) {
    whyPoints.push({
      text: `A shared passion for ${common[0]} could spark something special`,
      weight: 8,
    });
  }

  // Dating intent match
  if (myProfile.datingIntent === cProfile.datingIntent) {
    whyPoints.push({
      text: `You're both looking for ${cProfile.datingIntent.toLowerCase()} — aligned intentions lead to stronger connections`,
      weight: 15,
    });
  } else if (myProfile.seriousMode && cProfile.seriousMode) {
    whyPoints.push({
      text: `Both in Serious Mode — you're equally committed to finding something meaningful`,
      weight: 12,
    });
  }

  // Location
  if (myProfile.city?.toLowerCase() === cProfile.city?.toLowerCase()) {
    whyPoints.push({
      text: `Both based in ${cProfile.city} — easy to meet and build real-world connection`,
      weight: 10,
    });
  }

  // Age compatibility
  const ageDiff = Math.abs(myProfile.age - cProfile.age);
  if (ageDiff <= 3) {
    whyPoints.push({
      text: `Similar life stage — being close in age often means shared perspectives and experiences`,
      weight: 8,
    });
  }

  // Lifestyle match
  const lifestyleMatches: string[] = [];
  if (myProfile.smoking === cProfile.smoking) lifestyleMatches.push('smoking habits');
  if (myProfile.drinking === cProfile.drinking) lifestyleMatches.push('drinking preferences');
  if (myProfile.exercise === cProfile.exercise) lifestyleMatches.push('fitness levels');
  if (lifestyleMatches.length >= 2) {
    whyPoints.push({
      text: `Compatible lifestyles — matching ${lifestyleMatches.join(' and ')} show everyday compatibility`,
      weight: lifestyleMatches.length * 4,
    });
  }

  // Values alignment
  if (myProfile.children === cProfile.children && cProfile.children) {
    const childText = cProfile.children === 'want' ? 'both want kids' : cProfile.children === 'none' ? 'neither want kids right now' : 'similar views on family';
    whyPoints.push({
      text: `You ${childText} — crucial long-term alignment`,
      weight: 10,
    });
  }

  // Profile quality
  if (cProfile.profileScore >= 85) {
    whyPoints.push({
      text: `Their detailed profile (${cProfile.profileScore}% complete) shows genuine effort and authenticity`,
      weight: 6,
    });
  }

  // Profession/creativity angle
  if (candidate.prompts?.length >= 2) {
    whyPoints.push({
      text: `Their thoughtful prompt answers reveal personality depth — great for meaningful conversations`,
      weight: 5,
    });
  }

  // Zodiac
  const zodiacCompatible: Record<string, string[]> = {
    Aries: ['Leo', 'Sagittarius'], Taurus: ['Virgo', 'Capricorn'],
    Gemini: ['Libra', 'Aquarius'], Cancer: ['Scorpio', 'Pisces'],
    Leo: ['Aries', 'Sagittarius'], Virgo: ['Taurus', 'Capricorn'],
    Libra: ['Gemini', 'Aquarius'], Scorpio: ['Cancer', 'Pisces'],
    Sagittarius: ['Aries', 'Leo'], Capricorn: ['Taurus', 'Virgo'],
    Aquarius: ['Gemini', 'Libra'], Pisces: ['Cancer', 'Scorpio'],
  };
  if (myProfile.zodiac && cProfile.zodiac && zodiacCompatible[myProfile.zodiac]?.includes(cProfile.zodiac)) {
    whyPoints.push({
      text: `${myProfile.zodiac} & ${cProfile.zodiac} — classically compatible zodiac pairing`,
      weight: 4,
    });
  }

  // Sort by weight and return top 3
  whyPoints.sort((a, b) => b.weight - a.weight);
  const result = whyPoints.slice(0, 3).map(p => p.text);

  // Ensure at least 3 reasons
  while (result.length < 3) {
    const fillers = [
      'A fresh perspective could bring new energy to your dating journey',
      'Sometimes the best connections come from unexpected places',
      'Their unique background could complement yours beautifully',
    ];
    result.push(fillers[result.length - 1] || fillers[0]);
  }

  return result;
}

// ─── Move Recommendations (5 smart suggestions) ────
function generateMoveRecommendations(
  myProfile: any,
  candidate: any,
  commonInterests: string[],
): { text: string; type: string; confidence: number }[] {
  const recs: { text: string; type: string; confidence: number }[] = [];
  const cProfile = candidate.profile;
  const prompts = candidate.prompts || [];

  // 1. Interest-based moves (highest confidence)
  if (commonInterests.length > 0) {
    const interest = commonInterests[0];
    recs.push({
      text: `I noticed you love ${interest} too! What got you into it?`,
      type: 'shared-interest',
      confidence: 0.92,
    });
  }

  // 2. Prompt-based moves
  if (prompts.length > 0) {
    const prompt = prompts[0];
    recs.push({
      text: `Love your answer to "${prompt.question}" — ${prompt.answer.length > 30 ? 'that really resonated with me' : 'tell me more!'}`,
      type: 'prompt-response',
      confidence: 0.88,
    });
  }

  // 3. Profession-based move
  if (cProfile?.profession) {
    recs.push({
      text: `${cProfile.profession} sounds fascinating! What's the most unexpected part of your work?`,
      type: 'profession',
      confidence: 0.82,
    });
  }

  // 4. City/travel based
  if (cProfile?.city && myProfile?.city !== cProfile.city) {
    recs.push({
      text: `I've always wanted to visit ${cProfile.city}! What's your favorite hidden spot there?`,
      type: 'location',
      confidence: 0.78,
    });
  } else if (cProfile?.city) {
    recs.push({
      text: `Fellow ${cProfile.city} person! Do you have a favorite spot nobody else knows about?`,
      type: 'location',
      confidence: 0.85,
    });
  }

  // 5. Bio-based / creative move
  if (cProfile?.bio && cProfile.bio.length > 20) {
    recs.push({
      text: `Your bio caught my eye — "${cProfile.bio.substring(0, 40)}..." I'd love to hear the full story`,
      type: 'bio',
      confidence: 0.75,
    });
  }

  // 6. Photo compliment
  if (candidate.photos?.length > 0) {
    recs.push({
      text: `Your photos have such great energy! The one with the ${commonInterests[0] || 'vibe'} really stood out`,
      type: 'photo',
      confidence: 0.70,
    });
  }

  // 7. Second prompt
  if (prompts.length > 1) {
    recs.push({
      text: `"${prompts[1].answer.substring(0, 50)}" — I completely relate to this! Here's my take...`,
      type: 'prompt-response',
      confidence: 0.80,
    });
  }

  // Sort by confidence and return top 5
  recs.sort((a, b) => b.confidence - a.confidence);
  return recs.slice(0, 5);
}

// ─── GET /ai-match/suggestions ──────────────────────
aiMatchRouter.get('/suggestions', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);

    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    const candidates = await prisma.user.findMany({
      where: { id: { notIn: blockedIds }, active: true, privacySettings: { profileVisible: true } },
      include: {
        profile: true,
        interests: true,
        photos: { orderBy: { position: 'asc' } },
        prompts: { orderBy: { position: 'asc' } },
      },
      take: 50,
    });

    const scored = candidates.map(c => {
      const { score, reasons, concerns, common, breakdown } = computeCompatibility(myProfile, myInterestNames, c);
      const whyThisMatch = generateWhyThisMatch(myProfile, myInterestNames, c);
      const moveRecommendations = generateMoveRecommendations(myProfile, c, common);

      const { passwordHash, ...userData } = c;

      return {
        user: userData,
        aiScore: score,
        reasons,
        concerns,
        commonInterests: common,
        breakdown,
        whyThisMatch,
        moveRecommendations,
        suggestedIcebreaker: moveRecommendations[0]?.text || 'Start with a genuine compliment about their profile.',
      };
    });

    scored.sort((a, b) => b.aiScore - a.aiScore);
    res.json({ data: scored.slice(0, 20) });
  } catch (e) { next(e); }
});

// ─── GET /ai-match/score/:targetId ──────────────────
aiMatchRouter.get('/score/:targetId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const targetId = req.params.targetId;

    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: true, interests: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } } },
    });

    if (!target) {
      return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
    }

    const { score, reasons, concerns, common, breakdown } = computeCompatibility(myProfile, myInterestNames, target);
    const whyThisMatch = generateWhyThisMatch(myProfile, myInterestNames, target);
    const moveRecommendations = generateMoveRecommendations(myProfile, target, common);

    res.json({
      data: {
        score,
        reasons,
        concerns,
        commonInterests: common,
        breakdown,
        whyThisMatch,
        moveRecommendations,
      },
    });
  } catch (e) { next(e); }
});

// ─── GET /ai-match/why/:targetId — Why This Match ──
aiMatchRouter.get('/why/:targetId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const targetId = req.params.targetId;

    const myProfile = await prisma.profile.findUnique({ where: { userId } });
    const myInterests = await prisma.profileInterest.findMany({ where: { userId } });
    const myInterestNames = myInterests.map(i => i.name);

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      include: { profile: true, interests: true, prompts: true },
    });

    if (!target) {
      return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
    }

    const whyThisMatch = generateWhyThisMatch(myProfile, myInterestNames, target);
    const common = target.interests.filter(i => myInterestNames.includes(i.name)).map(i => i.name);
    const moveRecommendations = generateMoveRecommendations(myProfile, target, common);

    res.json({
      data: {
        whyThisMatch,
        moveRecommendations,
        commonInterests: common,
      },
    });
  } catch (e) { next(e); }
});
