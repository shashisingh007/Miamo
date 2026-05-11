// ─── Miamo Content Service ───────────────────────────
// Handles: Feed, Stories, Videos, Creativity
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const app = express();
const PORT = parseInt(process.env.PORT || '3205', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

interface AuthRequest extends Request { userId?: string; }
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (userId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    req.userId = userId; return next();
  }
  return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
}

// Health
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'content', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'content', db: 'disconnected' }); }
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'content' }); }
  catch { res.status(503).json({ ready: false, service: 'content' }); }
});

// ═══ FEED ════════════════════════════════════════════
app.get('/api/v1/feed', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cursor, type, authorId } = req.query;
    const where: any = { visibility: { in: ['everyone'] } };
    if (type) where.type = type;
    if (authorId) where.authorId = authorId;
    const posts = await prisma.feedPost.findMany({
      where, include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        reactions: true,
        comments: { take: 3, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, displayName: true } } } },
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' }, take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });
    const userId = req.userId!;
    const result = posts.map(p => {
      const { passwordHash, ...author } = p.author;
      const { reactions, ...rest } = p;
      return { ...rest, author, liked: reactions.some(r => r.userId === userId), likeCount: p._count.reactions, commentCount: p._count.comments };
    });
    res.json({ data: result, cursor: posts[posts.length - 1]?.id });
  } catch (e) { next(e); }
});

app.post('/api/v1/feed', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, content, mediaUrl, visibility } = req.body;
    const post = await prisma.feedPost.create({
      data: { authorId: req.userId!, type: type || 'thought', content, mediaUrl, visibility: visibility || 'everyone' },
      include: { author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
    });
    const { passwordHash, ...author } = post.author;
    res.json({ data: { ...post, author, liked: false, likeCount: 0, commentCount: 0 } });
  } catch (e) { next(e); }
});

app.put('/api/v1/feed/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.feedPost.update({ where: { id: req.params.id, authorId: req.userId }, data: { content: req.body.content, type: req.body.type, visibility: req.body.visibility } });
    res.json({ data: post });
  } catch (e) { next(e); }
});

app.delete('/api/v1/feed/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.feedPost.delete({ where: { id: req.params.id, authorId: req.userId } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

app.post('/api/v1/feed/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feedReaction.findUnique({ where: { postId_userId: { postId: req.params.id, userId: req.userId! } } });
    if (existing) { await prisma.feedReaction.delete({ where: { id: existing.id } }); res.json({ data: { liked: false } }); }
    else { await prisma.feedReaction.create({ data: { postId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } }); res.json({ data: { liked: true } }); }
  } catch (e) { next(e); }
});

app.post('/api/v1/feed/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.feedComment.create({ data: { postId: req.params.id, authorId: req.userId!, content: req.body.content }, include: { author: { select: { id: true, displayName: true, username: true } } } });
    res.json({ data: comment });
  } catch (e) { next(e); }
});

app.get('/api/v1/feed/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.feedComment.findMany({ where: { postId: req.params.id }, include: { author: { select: { id: true, displayName: true, username: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

// ═══ STORIES ═════════════════════════════════════════

// Helper: Get matched user IDs for the current user
async function getMatchedUserIds(userId: string): Promise<string[]> {
  const matches = await prisma.match.findMany({
    where: { active: true, OR: [{ user1Id: userId }, { user2Id: userId }] },
    select: { user1Id: true, user2Id: true },
  });
  return matches.map(m => m.user1Id === userId ? m.user2Id : m.user1Id);
}

// GET /api/v1/stories — Show only match stories + own stories
app.get('/api/v1/stories', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const matchedIds = await getMatchedUserIds(userId);
    const visibleUserIds = [userId, ...matchedIds];

    // Stories expire after 7 days hard limit, but stay until match sees them
    const hardMaxDate = new Date(Date.now() - 7 * 24 * 3600000);

    const stories = await prisma.story.findMany({
      where: {
        authorId: { in: visibleUserIds },
        createdAt: { gt: hardMaxDate },
      },
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        views: { where: { viewerId: userId } },
        likes: true,
        comments: { include: { author: { select: { id: true, displayName: true, username: true } } }, orderBy: { createdAt: 'asc' } },
        _count: { select: { views: true, likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by author
    const grouped: Record<string, any> = {};
    for (const s of stories) {
      const { passwordHash, ...author } = s.author;
      if (!grouped[s.authorId]) grouped[s.authorId] = { user: author, stories: [], viewed: true, isOwn: s.authorId === userId };
      const viewed = s.views.length > 0;
      const liked = s.likes.some(l => l.userId === userId);
      grouped[s.authorId].stories.push({
        id: s.id, authorId: s.authorId, type: s.type, content: s.content, mediaUrl: s.mediaUrl,
        visibility: s.visibility, expiresAt: s.expiresAt, createdAt: s.createdAt,
        viewed, liked, viewCount: s._count.views, likeCount: s._count.likes, commentCount: s._count.comments,
        comments: s.comments.map(c => ({ id: c.id, content: c.content, authorId: c.authorId, author: c.author, parentId: c.parentId, createdAt: c.createdAt })),
      });
      if (!viewed) grouped[s.authorId].viewed = false;
    }

    // Sort: own stories first, then unviewed, then viewed
    const result = Object.values(grouped).sort((a: any, b: any) => {
      if (a.isOwn) return -1;
      if (b.isOwn) return 1;
      if (!a.viewed && b.viewed) return -1;
      if (a.viewed && !b.viewed) return 1;
      return 0;
    });

    res.json({ data: result });
  } catch (e) { next(e); }
});

// GET /api/v1/stories/mine — Get own stories with insights
app.get('/api/v1/stories/mine', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stories = await prisma.story.findMany({
      where: { authorId: req.userId! },
      include: {
        views: { include: { viewer: { select: { id: true, displayName: true, username: true } } } },
        likes: { include: { user: { select: { id: true, displayName: true, username: true } } } },
        comments: { include: { author: { select: { id: true, displayName: true, username: true } }, replies: { include: { author: { select: { id: true, displayName: true, username: true } } } } }, orderBy: { createdAt: 'asc' } },
        _count: { select: { views: true, likes: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: stories });
  } catch (e) { next(e); }
});

// POST /api/v1/stories — Create story (with background color support)
app.post('/api/v1/stories', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, content, mediaUrl, visibility, expiresInHours, background } = req.body;
    const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 3600000);
    const storyContent = background ? JSON.stringify({ text: content || '', background }) : (content || '');
    const story = await prisma.story.create({
      data: { authorId: req.userId!, type: type || 'text', content: storyContent, mediaUrl, visibility: visibility || 'everyone', expiresAt },
    });
    res.json({ data: story });
  } catch (e) { next(e); }
});

// POST /api/v1/stories/:id/view — Mark as viewed
app.post('/api/v1/stories/:id/view', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.storyView.upsert({ where: { storyId_viewerId: { storyId: req.params.id, viewerId: req.userId! } }, create: { storyId: req.params.id, viewerId: req.userId! }, update: {} });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// POST /api/v1/stories/:id/like — Toggle like
app.post('/api/v1/stories/:id/like', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.storyLike.findUnique({ where: { storyId_userId: { storyId: req.params.id, userId: req.userId! } } });
    if (existing) {
      await prisma.storyLike.delete({ where: { id: existing.id } });
      res.json({ data: { liked: false } });
    } else {
      await prisma.storyLike.create({ data: { storyId: req.params.id, userId: req.userId! } });
      // Notify story author
      const story = await prisma.story.findUnique({ where: { id: req.params.id }, select: { authorId: true } });
      if (story && story.authorId !== req.userId) {
        await prisma.notification.create({ data: { userId: story.authorId, type: 'like', title: '❤️ Story liked!', body: 'Someone liked your story' } });
      }
      res.json({ data: { liked: true } });
    }
  } catch (e) { next(e); }
});

// POST /api/v1/stories/:id/react — Legacy reaction (still supported)
app.post('/api/v1/stories/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.storyView.upsert({ where: { storyId_viewerId: { storyId: req.params.id, viewerId: req.userId! } }, create: { storyId: req.params.id, viewerId: req.userId!, reaction: req.body.reaction }, update: { reaction: req.body.reaction } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// GET /api/v1/stories/:id/comments — Get comments
app.get('/api/v1/stories/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.storyComment.findMany({
      where: { storyId: req.params.id, parentId: null },
      include: {
        author: { select: { id: true, displayName: true, username: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        replies: {
          include: { author: { select: { id: true, displayName: true, username: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

// POST /api/v1/stories/:id/comments — Add comment (only matched users)
app.post('/api/v1/stories/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const story = await prisma.story.findUnique({ where: { id: req.params.id }, select: { authorId: true } });
    if (!story) return res.status(404).json({ error: { message: 'Story not found' } });

    // Check if users are matched (or own story)
    if (story.authorId !== userId) {
      const isMatched = await prisma.match.findFirst({
        where: { active: true, OR: [{ user1Id: userId, user2Id: story.authorId }, { user1Id: story.authorId, user2Id: userId }] },
      });
      if (!isMatched) return res.status(403).json({ error: { message: 'You can only comment on stories from your matches' } });
    }

    const { content, parentId } = req.body;
    // If replying, verify parent comment exists and belongs to this story
    if (parentId) {
      const parentComment = await prisma.storyComment.findUnique({ where: { id: parentId } });
      if (!parentComment || parentComment.storyId !== req.params.id) return res.status(400).json({ error: { message: 'Invalid parent comment' } });
    }

    const comment = await prisma.storyComment.create({
      data: { storyId: req.params.id, authorId: userId, content, parentId },
      include: { author: { select: { id: true, displayName: true, username: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
    });

    // Notify story author
    if (story.authorId !== userId) {
      await prisma.notification.create({ data: { userId: story.authorId, type: 'comment', title: '💬 New story comment', body: `"${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"` } });
    }

    res.json({ data: comment });
  } catch (e) { next(e); }
});

// DELETE /api/v1/stories/:id/comments/:commentId — Delete own comment
app.delete('/api/v1/stories/:id/comments/:commentId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.storyComment.delete({ where: { id: req.params.commentId, authorId: req.userId } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// GET /api/v1/stories/:id/viewers — Viewers list (story author only)
app.get('/api/v1/stories/:id/viewers', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const views = await prisma.storyView.findMany({ where: { storyId: req.params.id }, include: { viewer: { select: { id: true, displayName: true, username: true } } } });
    res.json({ data: views });
  } catch (e) { next(e); }
});

// POST /api/v1/stories/:id/post-to-feed — Convert story to feed post
app.post('/api/v1/stories/:id/post-to-feed', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const story = await prisma.story.findUnique({ where: { id: req.params.id, authorId: req.userId } });
    if (!story) return res.status(404).json({ error: { message: 'Story not found or not yours' } });

    // Parse content (may contain background JSON)
    let textContent = story.content;
    try { const parsed = JSON.parse(story.content); textContent = parsed.text || story.content; } catch {}

    const post = await prisma.feedPost.create({
      data: { authorId: req.userId!, type: story.mediaUrl ? 'photo' : 'thought', content: textContent, mediaUrl: story.mediaUrl, visibility: 'everyone' },
      include: { author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
    });
    const { passwordHash, ...author } = post.author;
    res.json({ data: { ...post, author, liked: false, likeCount: 0, commentCount: 0 } });
  } catch (e) { next(e); }
});

// DELETE /api/v1/stories/:id — Delete story
app.delete('/api/v1/stories/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.story.delete({ where: { id: req.params.id, authorId: req.userId } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

// ═══ VIDEOS ══════════════════════════════════════════
app.get('/api/v1/videos', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, cursor } = req.query;
    const where: any = { visibility: 'everyone' };
    if (category && category !== 'all') where.category = category;
    const videos = await prisma.video.findMany({
      where, include: { author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, reactions: true, _count: { select: { reactions: true, comments: true } } },
      orderBy: { createdAt: 'desc' }, take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });
    const userId = req.userId!;
    const result = videos.map(v => { const { passwordHash, ...author } = v.author; const { reactions, ...rest } = v; return { ...rest, author, liked: reactions.some(r => r.userId === userId), likeCount: v._count.reactions, commentCount: v._count.comments }; });
    res.json({ data: result, cursor: videos[videos.length - 1]?.id });
  } catch (e) { next(e); }
});

app.post('/api/v1/videos', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, url, thumbnailUrl, category, visibility } = req.body;
    const video = await prisma.video.create({ data: { authorId: req.userId!, title, description, url, thumbnailUrl, category: category || 'general', visibility: visibility || 'everyone' } });
    res.json({ data: video });
  } catch (e) { next(e); }
});

app.post('/api/v1/videos/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.videoReaction.findUnique({ where: { videoId_userId: { videoId: req.params.id, userId: req.userId! } } });
    if (existing) { await prisma.videoReaction.delete({ where: { id: existing.id } }); res.json({ data: { liked: false } }); }
    else { await prisma.videoReaction.create({ data: { videoId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } }); await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } }); res.json({ data: { liked: true } }); }
  } catch (e) { next(e); }
});

app.post('/api/v1/videos/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.videoComment.create({ data: { videoId: req.params.id, authorId: req.userId!, content: req.body.content }, include: { author: { select: { id: true, displayName: true } } } });
    res.json({ data: comment });
  } catch (e) { next(e); }
});

app.get('/api/v1/videos/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.videoComment.findMany({ where: { videoId: req.params.id }, include: { author: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

app.post('/api/v1/videos/:id/view', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

// ═══ CREATIVITY ══════════════════════════════════════
app.get('/api/v1/creativity/categories', authMiddleware, async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.creativityCategory.findMany({ include: { _count: { select: { items: true } } }, orderBy: { name: 'asc' } });
    res.json({ data: categories });
  } catch (e) { next(e); }
});

// ── AI-POWERED PERSONALIZED FEED ──────────────────────
// The "For You" algorithm: collaborative filtering + engagement signals + user interest matching
app.get('/api/v1/creativity/feed', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { category, cursor } = req.query;
    const isGeneral = !category || category === 'general' || category === 'all';

    // 1. Build user interest profile from: their interests, their reaction history, their view history
    const userInterests = await prisma.profileInterest.findMany({ where: { userId }, select: { name: true } });
    const interestNames = userInterests.map(i => i.name.toLowerCase());

    // Recent reactions (last 100) — what has this user been liking?
    const recentReactions = await prisma.creativityReaction.findMany({
      where: { userId },
      include: { item: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Build engagement-weighted category scores
    const categoryEngagement: Record<string, number> = {};
    for (const r of recentReactions) {
      if (!r.item?.category) continue;
      const catName = r.item.category.name;
      // More recent reactions weigh more (decay factor)
      const ageHours = (Date.now() - r.createdAt.getTime()) / 3600000;
      const weight = Math.max(0.1, 1 - ageHours / (24 * 30)); // decay over 30 days
      categoryEngagement[catName] = (categoryEngagement[catName] || 0) + weight;
    }

    // Boost categories that match user profile interests
    for (const [catName, _] of Object.entries(categoryEngagement)) {
      if (interestNames.some(i => catName.toLowerCase().includes(i) || i.includes(catName.toLowerCase()))) {
        categoryEngagement[catName] = (categoryEngagement[catName] || 0) + 2;
      }
    }

    // 2. Build exclusion set: already viewed items (to avoid repeats)
    const viewedItems = await prisma.creativityView.findMany({
      where: { viewerId: userId },
      select: { itemId: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const viewedIds = new Set(viewedItems.map(v => v.itemId));

    // 3. Build blocks
    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] } });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);

    // 4. Fetch candidate items
    const where: any = {
      visibility: 'everyone',
      authorId: { notIn: [...blockedIds, userId] }, // Don't show own content in feed
    };

    if (!isGeneral && category) {
      // Category-specific: only that category
      const cat = await prisma.creativityCategory.findUnique({ where: { name: category as string } });
      if (cat) where.categoryId = cat.id;
    }

    const candidates = await prisma.creativityItem.findMany({
      where,
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true } },
        category: true,
        reactions: { where: { userId }, take: 1 },
        _count: { select: { reactions: true, comments: true, viewRecords: true } },
      },
      orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }],
      take: 80,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    // 5. Score each candidate using AI signals
    const scored = candidates.map(item => {
      let score = 0;
      const catName = item.category?.name || '';

      // A) Trend score (normalized 0-30)
      score += Math.min(item.trendScore / 3, 30);

      // B) Engagement rate (likes+comments / views) — high-quality signal
      const engagementRate = item.views > 0
        ? (item._count.reactions + item._count.comments * 2) / item.views
        : 0;
      score += engagementRate * 20; // up to ~20 points

      // C) Category affinity (collaborative filtering)
      if (isGeneral) {
        const catAffinity = categoryEngagement[catName] || 0;
        score += catAffinity * 5; // heavy weight on user's preferred categories
      }

      // D) Interest match — content from categories matching user's interests
      const interestMatch = interestNames.some(
        i => catName.toLowerCase().includes(i) || i.includes(catName.toLowerCase())
      );
      if (interestMatch) score += 15;

      // E) Recency boost (newer content gets a boost)
      const ageHours = (Date.now() - item.createdAt.getTime()) / 3600000;
      score += Math.max(0, 20 - ageHours / 2); // decays over 40 hours

      // F) Verified author boost
      if (item.author.verified) score += 5;

      // G) Freshness penalty for already-viewed content
      if (viewedIds.has(item.id)) score -= 40;

      // H) Diverse content — slight penalty if multiple from same author
      // (handled via sorting diversity below)

      const { passwordHash, ...author } = item.author;
      return {
        id: item.id,
        authorId: item.authorId,
        categoryId: item.categoryId,
        type: item.type,
        title: item.title,
        content: item.content,
        mediaUrl: item.mediaUrl,
        visibility: item.visibility,
        featured: item.featured,
        views: item.views,
        trendScore: item.trendScore,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        author,
        category: item.category,
        liked: item.reactions.length > 0,
        likeCount: item._count.reactions,
        commentCount: item._count.comments,
        viewCount: item._count.viewRecords,
        _aiScore: score,
      };
    });

    // 6. Sort by AI score then apply author diversity (max 2 in a row from same author)
    scored.sort((a, b) => b._aiScore - a._aiScore);

    const diversified: typeof scored = [];
    const authorConsecutive: Record<string, number> = {};
    const deferred: typeof scored = [];

    for (const item of scored) {
      const lastAuthor = diversified.length > 0
        ? diversified[diversified.length - 1].authorId
        : null;

      if (item.authorId === lastAuthor) {
        authorConsecutive[item.authorId] = (authorConsecutive[item.authorId] || 1) + 1;
        if (authorConsecutive[item.authorId] > 2) {
          deferred.push(item);
          continue;
        }
      } else {
        authorConsecutive[item.authorId] = 1;
      }
      diversified.push(item);
    }
    // Append deferred items at end
    diversified.push(...deferred);

    // Return top 20
    const result = diversified.slice(0, 20);
    res.json({
      data: result,
      cursor: result[result.length - 1]?.id,
      meta: {
        total: candidates.length,
        category: isGeneral ? 'general' : category,
        algorithm: 'collaborative-filtering-v1',
      },
    });
  } catch (e) { next(e); }
});

// ── Hide content (don't show this author's items again) ──
app.post('/api/v1/creativity/items/:id/hide', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Mark as viewed so it won't appear again, and block the author if requested
    const item = await prisma.creativityItem.findUnique({ where: { id: req.params.id }, select: { authorId: true } });
    if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
    await prisma.creativityView.upsert({
      where: { itemId_viewerId: { itemId: req.params.id, viewerId: req.userId! } },
      create: { itemId: req.params.id, viewerId: req.userId! },
      update: {},
    });
    // If the user wants to hide all from this author, they can call block separately
    res.json({ data: { hidden: true } });
  } catch (e) { next(e); }
});

// ── Miamo Move from creativity (express interest from content) ──
app.post('/api/v1/creativity/items/:id/move', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.creativityItem.findUnique({ where: { id: req.params.id }, select: { authorId: true, title: true } });
    if (!item) return res.status(404).json({ error: { message: 'Item not found' } });
    if (item.authorId === req.userId) return res.status(400).json({ error: { message: 'Cannot send move to yourself' } });

    const { message } = req.body;
    // Create a like to track interest
    try {
      await prisma.like.create({
        data: { fromUserId: req.userId!, toUserId: item.authorId, targetType: 'creativity', targetId: req.params.id },
      });
    } catch {} // might already exist

    // Create a match request with context
    const existing = await prisma.matchRequest.findUnique({
      where: { fromUserId_toUserId: { fromUserId: req.userId!, toUserId: item.authorId } },
    });
    if (existing) {
      await prisma.matchRequest.update({
        where: { id: existing.id },
        data: { message: message || `Loved your "${item.title}"`, type: 'move', targetType: 'creativity', targetId: req.params.id },
      });
    } else {
      await prisma.matchRequest.create({
        data: {
          fromUserId: req.userId!, toUserId: item.authorId,
          message: message || `Loved your "${item.title}"`,
          type: 'move', targetType: 'creativity', targetId: req.params.id, status: 'pending',
        },
      });
    }

    // Notify the creator
    await prisma.notification.create({
      data: {
        userId: item.authorId, type: 'like',
        title: '💫 Miamo Move on your content!',
        body: message ? `Someone loved "${item.title}": "${message.substring(0, 50)}"` : `Someone made a move on your "${item.title}"!`,
      },
    });

    // Check for mutual like → auto-match
    const mutual = await prisma.like.findFirst({ where: { fromUserId: item.authorId, toUserId: req.userId! } });
    let match = null;
    if (mutual) {
      const existingMatch = await prisma.match.findFirst({
        where: { OR: [{ user1Id: req.userId!, user2Id: item.authorId }, { user1Id: item.authorId, user2Id: req.userId! }] },
      });
      if (!existingMatch) {
        match = await prisma.match.create({ data: { user1Id: req.userId!, user2Id: item.authorId } });
        await prisma.chat.create({ data: { matchId: match.id, user1Id: req.userId!, user2Id: item.authorId } });
        await prisma.notification.create({ data: { userId: item.authorId, type: 'match', title: 'New Match! 🎉', body: 'Your creativity sparked a connection!' } });
        await prisma.notification.create({ data: { userId: req.userId!, type: 'match', title: 'New Match! 🎉', body: 'You matched through creativity!' } });
      } else { match = existingMatch; }
    }

    // Update trend score (moves are high-value engagement)
    await recalcTrend(req.params.id);

    res.json({ data: { success: true, match, isMutual: !!mutual } });
  } catch (e) { next(e); }
});

// ── Share (increment share count on trend) ──
app.post('/api/v1/creativity/items/:id/share', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.trend.updateMany({
      where: { itemId: req.params.id },
      data: { shares: { increment: 1 } },
    });
    res.json({ data: { shared: true } });
  } catch (e) { next(e); }
});

// ── Get comments for an item ──
app.get('/api/v1/creativity/items/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.creativityComment.findMany({
      where: { itemId: req.params.id },
      include: { author: { select: { id: true, displayName: true, username: true, verified: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

app.get('/api/v1/creativity/items', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, sort, cursor, featured } = req.query;
    const where: any = { visibility: 'everyone' };
    if (category && category !== 'all') {
      const cat = await prisma.creativityCategory.findUnique({ where: { name: category as string } });
      if (cat) where.categoryId = cat.id;
    }
    if (featured === 'true') where.featured = true;
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'trending') orderBy = { trendScore: 'desc' };
    if (sort === 'views') orderBy = { views: 'desc' };

    const items = await prisma.creativityItem.findMany({
      where, include: { author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, category: true, reactions: true, _count: { select: { reactions: true, comments: true, viewRecords: true } } },
      orderBy, take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });
    const userId = req.userId!;
    const result = items.map(i => { const { passwordHash, ...author } = i.author; const { reactions, ...rest } = i; return { ...rest, author, liked: reactions.some(r => r.userId === userId), likeCount: i._count.reactions, commentCount: i._count.comments, viewCount: i._count.viewRecords }; });
    res.json({ data: result, cursor: items[items.length - 1]?.id });
  } catch (e) { next(e); }
});

app.post('/api/v1/creativity/items', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let { categoryId, category, type, title, content, description, mediaUrl, visibility, featured } = req.body;
    // Accept 'category' name and look up categoryId
    if (!categoryId && category) {
      const cat = await prisma.creativityCategory.findUnique({ where: { name: category } });
      if (cat) categoryId = cat.id;
      else {
        // Create the category if it doesn't exist
        const newCat = await prisma.creativityCategory.create({ data: { name: category } });
        categoryId = newCat.id;
      }
    }
    // Accept 'description' as alias for 'content'
    const itemContent = content || description || '';
    const item = await prisma.creativityItem.create({
      data: { authorId: req.userId!, categoryId, type: type || 'text', title: title || 'Untitled', content: itemContent, mediaUrl, visibility: visibility || 'everyone', featured: featured || false },
      include: { category: true, author: { include: { profile: true } } },
    });
    res.json({ data: item });
  } catch (e) { next(e); }
});

app.post('/api/v1/creativity/items/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.creativityReaction.findUnique({ where: { itemId_userId: { itemId: req.params.id, userId: req.userId! } } });
    if (existing) { await prisma.creativityReaction.delete({ where: { id: existing.id } }); res.json({ data: { liked: false } }); }
    else { await prisma.creativityReaction.create({ data: { itemId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } }); res.json({ data: { liked: true } }); }
    await recalcTrend(req.params.id);
  } catch (e) { next(e); }
});

app.post('/api/v1/creativity/items/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.creativityComment.create({
      data: { itemId: req.params.id, authorId: req.userId!, content: req.body.content },
      include: { author: { select: { id: true, displayName: true, username: true, verified: true, photos: { take: 1, orderBy: { position: 'asc' } } } } },
    });
    await recalcTrend(req.params.id);
    res.json({ data: comment });
  } catch (e) { next(e); }
});

app.post('/api/v1/creativity/items/:id/view', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.creativityView.upsert({ where: { itemId_viewerId: { itemId: req.params.id, viewerId: req.userId! } }, create: { itemId: req.params.id, viewerId: req.userId! }, update: {} });
    await prisma.creativityItem.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    await recalcTrend(req.params.id);
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.get('/api/v1/creativity/trends', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category && category !== 'all') where.category = category;
    const trends = await prisma.trend.findMany({ where, orderBy: category ? { categoryRank: 'asc' } : { rank: 'asc' }, take: 50 });

    // Batch-load all items in one query instead of N+1
    const itemIds = trends.map(t => t.itemId);
    const items = await prisma.creativityItem.findMany({
      where: { id: { in: itemIds } },
      include: { author: { select: { id: true, displayName: true, username: true, verified: true, profile: { select: { age: true, city: true, avatarGradient: true, online: true } }, photos: { take: 1, orderBy: { position: 'asc' } } } }, category: true },
    });
    const itemMap = new Map(items.map(i => [i.id, i]));

    const enriched = trends.map(t => {
      const item = itemMap.get(t.itemId);
      if (!item) return null;
      return { ...t, item };
    });
    res.json({ data: enriched.filter(Boolean) });
  } catch (e) { next(e); }
});

async function recalcTrend(itemId: string) {
  try {
    const item = await prisma.creativityItem.findUnique({ where: { id: itemId }, include: { reactions: true, comments: true, viewRecords: true, category: true } });
    if (!item) return;
    const views = item.views;
    const likes = item.reactions.length;
    const comments = item.comments.length;
    const recencyBoost = Math.max(0, 50 - (Date.now() - item.createdAt.getTime()) / 3600000);
    const score = views * 1 + likes * 3 + comments * 5 + recencyBoost;
    await prisma.trend.upsert({
      where: { itemId_itemType: { itemId, itemType: 'creativity' } },
      create: { itemId, itemType: 'creativity', category: item.category.name, score, views, likes, comments },
      update: { score, views, likes, comments, calculatedAt: new Date() },
    });
    await prisma.creativityItem.update({ where: { id: itemId }, data: { trendScore: score } });
  } catch { /* ignore */ }
}

// ═══ DATE TO MARRY (Matrimonial) ═════════════════════
// Get my matrimonial profile
app.get('/api/v1/matrimonial/profile', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let profile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile) {
      // Auto-create a blank profile
      const user = await prisma.user.findUnique({ where: { id: req.userId! }, include: { profile: true } });
      profile = await prisma.matrimonialProfile.create({
        data: {
          userId: req.userId!,
          fullName: user?.displayName || '',
          religion: '',
          caste: '',
        },
      });
    }
    res.json({ data: profile });
  } catch (e) { next(e); }
});

// Update my matrimonial profile
app.put('/api/v1/matrimonial/profile', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    const data = req.body;
    // Remove fields that shouldn't be updated directly
    delete data.id; delete data.userId; delete data.createdAt; delete data.updatedAt;
    delete data.idVerified; delete data.incomeVerified; delete data.educationVerified; delete data.photoVerified;

    let profile;
    if (existing) {
      profile = await prisma.matrimonialProfile.update({ where: { userId: req.userId! }, data });
    } else {
      profile = await prisma.matrimonialProfile.create({ data: { ...data, userId: req.userId! } });
    }
    res.json({ data: profile });
  } catch (e) { next(e); }
});

// Browse matrimonial profiles with filters
app.get('/api/v1/matrimonial/browse', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { religion, caste, city, ageMin, ageMax, education, income, manglik, maritalStatus, diet, motherTongue, cursor } = req.query;
    const where: any = { userId: { not: req.userId! } };
    if (religion) where.religion = { equals: religion as string, mode: 'insensitive' };
    if (caste) where.caste = { equals: caste as string, mode: 'insensitive' };
    if (city) where.workingCity = { contains: city as string, mode: 'insensitive' };
    if (education) where.education = { contains: education as string, mode: 'insensitive' };
    if (income) where.annualIncome = { not: '' };
    if (manglik && manglik !== 'any') where.manglik = manglik as string;
    if (maritalStatus) where.maritalStatus = maritalStatus as string;
    if (diet) where.diet = diet as string;
    if (motherTongue) where.motherTongue = { equals: motherTongue as string, mode: 'insensitive' };
    // Require at least fullName or religion to be set (i.e. profile filled)
    where.fullName = { not: '' };

    const profiles = await prisma.matrimonialProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, displayName: true, username: true, verified: true,
            profile: { select: { age: true, gender: true, city: true, profession: true, avatarGradient: true, online: true, bio: true } },
            photos: { take: 3, orderBy: { position: 'asc' } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    // Check access granted for each profile
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    const result = profiles.map(p => {
      const { phoneNumber, alternatePhone, linkedIn, contactEmail, ...safe } = p;
      return {
        ...safe,
        // Only show contact info if public or access granted (checked later per-request)
        hasPhone: !!phoneNumber,
        hasLinkedIn: !!linkedIn,
        hasEmail: !!contactEmail,
      };
    });
    res.json({ data: result, cursor: profiles[profiles.length - 1]?.id });
  } catch (e) { next(e); }
});

// Get a specific matrimonial profile (with access checks)
app.get('/api/v1/matrimonial/profile/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.matrimonialProfile.findUnique({
      where: { userId: req.params.userId },
      include: {
        user: {
          select: {
            id: true, displayName: true, username: true, verified: true,
            profile: { select: { age: true, gender: true, city: true, profession: true, avatarGradient: true, online: true, bio: true, profileScore: true } },
            photos: { orderBy: { position: 'asc' } },
            interests: true,
          },
        },
      },
    });
    if (!profile) return res.status(404).json({ error: { message: 'Matrimonial profile not found' } });

    // Check what access the requester has
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    let accessGrants: any[] = [];
    if (myProfile) {
      accessGrants = await prisma.bioDataAccessRequest.findMany({
        where: { ownerId: profile.id, requesterId: myProfile.id, status: 'granted' },
      });
    }
    const grantedTypes = new Set(accessGrants.map(a => a.accessType));
    const isOwn = req.params.userId === req.userId;

    const { phoneNumber, alternatePhone, linkedIn, contactEmail, ...safe } = profile;

    res.json({
      data: {
        ...safe,
        // Show contact info only if own profile, public, or access granted
        phoneNumber: isOwn || profile.phonePublic || grantedTypes.has('phone') ? phoneNumber : null,
        alternatePhone: isOwn || profile.phonePublic || grantedTypes.has('phone') ? alternatePhone : null,
        linkedIn: isOwn || profile.linkedInPublic || grantedTypes.has('linkedin') ? linkedIn : null,
        contactEmail: isOwn || profile.emailPublic || grantedTypes.has('email') ? contactEmail : null,
        hasPhone: !!phoneNumber,
        hasLinkedIn: !!linkedIn,
        hasEmail: !!contactEmail,
        accessGrants: isOwn ? [] : accessGrants.map(a => ({ type: a.accessType, status: a.status })),
        isOwn,
      },
    });
  } catch (e) { next(e); }
});

// Request access to someone's info
app.post('/api/v1/matrimonial/access/request', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetUserId, accessType, message } = req.body;
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    const targetProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: targetUserId } });
    if (!myProfile || !targetProfile) return res.status(400).json({ error: { message: 'Both users need matrimonial profiles' } });
    if (myProfile.id === targetProfile.id) return res.status(400).json({ error: { message: 'Cannot request access to your own profile' } });

    const request = await prisma.bioDataAccessRequest.upsert({
      where: { ownerId_requesterId_accessType: { ownerId: targetProfile.id, requesterId: myProfile.id, accessType } },
      create: { ownerId: targetProfile.id, requesterId: myProfile.id, accessType, message: message || '', status: 'pending' },
      update: { status: 'pending', message: message || '' },
    });
    res.json({ data: request });
  } catch (e) { next(e); }
});

// Get pending access requests (for me to approve/deny)
app.get('/api/v1/matrimonial/access/incoming', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    if (!myProfile) return res.json({ data: [] });

    const requests = await prisma.bioDataAccessRequest.findMany({
      where: { ownerId: myProfile.id },
      include: {
        requester: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true, verified: true,
                profile: { select: { age: true, gender: true, city: true, avatarGradient: true } },
                photos: { take: 1, orderBy: { position: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests });
  } catch (e) { next(e); }
});

// Get my sent access requests
app.get('/api/v1/matrimonial/access/sent', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    if (!myProfile) return res.json({ data: [] });

    const requests = await prisma.bioDataAccessRequest.findMany({
      where: { requesterId: myProfile.id },
      include: {
        owner: {
          include: {
            user: {
              select: { id: true, displayName: true, username: true,
                profile: { select: { age: true, city: true, avatarGradient: true } },
                photos: { take: 1, orderBy: { position: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: requests });
  } catch (e) { next(e); }
});

// Grant or deny access
app.post('/api/v1/matrimonial/access/:id/:action', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, action } = req.params;
    if (!['grant', 'deny', 'revoke'].includes(action)) return res.status(400).json({ error: { message: 'Invalid action' } });

    const request = await prisma.bioDataAccessRequest.findUnique({ where: { id }, include: { owner: true } });
    if (!request) return res.status(404).json({ error: { message: 'Request not found' } });
    if (request.owner.userId !== req.userId) return res.status(403).json({ error: { message: 'Not authorized' } });

    const statusMap: Record<string, string> = { grant: 'granted', deny: 'denied', revoke: 'revoked' };
    const updated = await prisma.bioDataAccessRequest.update({
      where: { id },
      data: { status: statusMap[action], ...(action === 'grant' ? { grantedAt: new Date() } : {}) },
    });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Get same-caste / matching profiles
app.get('/api/v1/matrimonial/matches', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    if (!myProfile) return res.json({ data: [] });

    const where: any = { userId: { not: req.userId! }, fullName: { not: '' } };
    // Match by religion and optionally caste
    if (myProfile.religion) where.religion = { equals: myProfile.religion, mode: 'insensitive' };
    if (myProfile.partnerCaste) where.caste = { equals: myProfile.partnerCaste, mode: 'insensitive' };
    else if (myProfile.caste) where.caste = { equals: myProfile.caste, mode: 'insensitive' };

    const profiles = await prisma.matrimonialProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true, displayName: true, username: true, verified: true,
            profile: { select: { age: true, gender: true, city: true, profession: true, avatarGradient: true, online: true } },
            photos: { take: 2, orderBy: { position: 'asc' } },
          },
        },
      },
      take: 30,
      orderBy: { updatedAt: 'desc' },
    });

    const result = profiles.map(p => {
      const { phoneNumber, alternatePhone, linkedIn, contactEmail, ...safe } = p;
      return { ...safe, hasPhone: !!phoneNumber, hasLinkedIn: !!linkedIn, hasEmail: !!contactEmail };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Get bio data templates list
app.get('/api/v1/matrimonial/templates', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const templates = [
    { id: 'royal-rajasthani', name: 'Royal Rajasthani', description: 'Rich gold & maroon with Rajput motifs', colors: ['#8B0000', '#FFD700', '#FFF8DC'], premium: false },
    { id: 'south-indian-temple', name: 'South Indian Temple', description: 'Traditional green & gold with kolam patterns', colors: ['#006400', '#FFD700', '#FFF5E1'], premium: false },
    { id: 'bengali-lal-paar', name: 'Bengali Lal Paar', description: 'Classic red-white with alpona border', colors: ['#DC143C', '#FFFFFF', '#FFE4E1'], premium: false },
    { id: 'punjabi-phulkari', name: 'Punjabi Phulkari', description: 'Vibrant embroidery-style colorful design', colors: ['#FF6B00', '#FFD700', '#FF1493'], premium: false },
    { id: 'gujarati-bandhani', name: 'Gujarati Bandhani', description: 'Tie-dye inspired with mirror work motifs', colors: ['#FF0000', '#008000', '#FFD700'], premium: false },
    { id: 'marathi-paithani', name: 'Marathi Paithani', description: 'Orange & green with peacock motifs', colors: ['#FF8C00', '#006400', '#FFD700'], premium: false },
    { id: 'kerala-kasavu', name: 'Kerala Kasavu', description: 'Elegant cream & gold with temple border', colors: ['#FFFFF0', '#FFD700', '#8B4513'], premium: false },
    { id: 'lucknowi-chikan', name: 'Lucknowi Chikan', description: 'Delicate white embroidery with pastel tones', colors: ['#FFFFFF', '#F0E6FF', '#E8F5E9'], premium: false },
    { id: 'mughal-royal', name: 'Mughal Royal', description: 'Regal blue & gold with Islamic geometric art', colors: ['#000080', '#FFD700', '#F5F5DC'], premium: true },
    { id: 'kashmiri-pashmina', name: 'Kashmiri Pashmina', description: 'Warm tones with paisley & chinar patterns', colors: ['#800020', '#C19A6B', '#F5DEB3'], premium: true },
    { id: 'assamese-mekhela', name: 'Assamese Mekhela', description: 'Red & gold with Assamese motifs', colors: ['#B22222', '#FFD700', '#FFFAF0'], premium: false },
    { id: 'odia-bomkai', name: 'Odia Bomkai', description: 'Traditional maroon with tribal weave patterns', colors: ['#800000', '#FF8C00', '#FFFACD'], premium: false },
    { id: 'manipuri-phanek', name: 'Manipuri Phanek', description: 'Striped pattern with northeast floral', colors: ['#FF69B4', '#8B008B', '#FFE4B5'], premium: false },
    { id: 'hyderabadi-pearl', name: 'Hyderabadi Pearl', description: 'Pearl white & teal with Charminar motifs', colors: ['#FFFFF0', '#008080', '#FFD700'], premium: true },
    { id: 'goan-catholic', name: 'Goan Christian', description: 'Serene white & blue Mediterranean style', colors: ['#FFFFFF', '#4169E1', '#FFD700'], premium: false },
    { id: 'sikh-golden', name: 'Sikh Golden Temple', description: 'Divine gold & white with Khanda motifs', colors: ['#FFD700', '#FFFFFF', '#FF8C00'], premium: false },
    { id: 'jain-peaceful', name: 'Jain Shanti', description: 'Peaceful white & saffron with Jain symbols', colors: ['#FFFFFF', '#FF8C00', '#006400'], premium: false },
    { id: 'modern-minimal', name: 'Modern Minimal', description: 'Clean contemporary design with subtle elegance', colors: ['#2D3748', '#EDF2F7', '#A78BFA'], premium: false },
    { id: 'rose-garden', name: 'Rose Garden', description: 'Romantic pink & blush with floral accents', colors: ['#FFC0CB', '#FF69B4', '#FFE4E1'], premium: true },
    { id: 'midnight-royal', name: 'Midnight Royal', description: 'Dark luxury with gold accents', colors: ['#1A1A2E', '#FFD700', '#E94560'], premium: true },
  ];
  res.json({ data: templates });
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Prisma FK violation on userId means the user's session is stale (deleted after reseed)
  if (err?.code === 'P2003' && err?.message?.includes('userId')) {
    return res.status(401).json({ error: { message: 'Session expired — please log in again', code: 'UNAUTHORIZED', statusCode: 401 } });
  }
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => { console.log(`\n⚡ Miamo Content Service on port ${PORT}\n`); });
}
