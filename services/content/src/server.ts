// ─── Miamo Content Service ───────────────────────────
// Handles: Feed, Stories, Videos, Creativity
import express, { Request, Response, NextFunction } from 'express';
import { LRUCache, MinHeap, TTL, feedCache, activityCache } from '../../shared/cache';
import { scoreFeedItem, scoreDtm, scoreDtmEnhanced, type FeedItem, type FeedUserProfile, type DtmUser, type DtmCandidate } from '../../shared/algorithms';
import { logger } from '../../shared/src/logger';
import { sanitize, sanitizeObject } from '../../shared/src/sanitize';
import { auditLog, trackActivity } from '../../shared/src/audit';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware } from '../../shared/src/service';

const prisma = createPrisma(15);
export const app = express();
const PORT = parseInt(process.env.PORT || '3205', 10);

applyBaseMiddleware(app, { jsonLimit: '10mb' });
interface AuthRequest extends Request { userId?: string }
const authMiddleware = createInternalAuthMiddleware();
installHealthRoutes(app, 'content', prisma);

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
    const { type, content: rawContent, mediaUrl, visibility } = req.body;
    const content = sanitize(rawContent || '');
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
    const post = await prisma.feedPost.update({ where: { id: req.params.id, authorId: req.userId }, data: { content: sanitize(req.body.content || ''), type: req.body.type, visibility: req.body.visibility } });
    res.json({ data: post });
  } catch (e) { next(e); }
});

app.delete('/api/v1/feed/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { await prisma.feedPost.delete({ where: { id: req.params.id, authorId: req.userId } }); auditLog(prisma, req.userId!, 'feed_post_delete', { postId: req.params.id }); res.json({ data: { success: true } }); } catch (e) { next(e); }
});

app.post('/api/v1/feed/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feedReaction.findUnique({ where: { postId_userId: { postId: req.params.id, userId: req.userId! } } });
    if (existing) { await prisma.feedReaction.delete({ where: { id: existing.id } }); res.json({ data: { liked: false } }); }
    else {
      await prisma.feedReaction.create({ data: { postId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } });
      trackActivity(prisma, req.userId!, 'like', 'feed', req.params.id);
      res.json({ data: { liked: true } });
    }
  } catch (e) { next(e); }
});

app.post('/api/v1/feed/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.feedComment.create({ data: { postId: req.params.id, authorId: req.userId!, content: sanitize(req.body.content || '') }, include: { author: { select: { id: true, displayName: true, username: true } } } });
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
    const { type, content: rawStoryContent, mediaUrl, visibility, expiresInHours, background } = req.body;
    const content = sanitize(rawStoryContent || '');
    const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 3600000);
    const storyContent = background ? JSON.stringify({ text: content, background }) : content;
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
    trackActivity(prisma, req.userId!, 'view', 'story', req.params.id);
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
      trackActivity(prisma, req.userId!, 'like', 'story', req.params.id);
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

    const { content: rawCommentContent, parentId } = req.body;
    const content = sanitize(rawCommentContent || '');
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
    auditLog(prisma, req.userId!, 'story_comment_delete', { storyId: req.params.id, commentId: req.params.commentId });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// GET /api/v1/stories/:id/viewers — Viewers list (story author only)
app.get('/api/v1/stories/:id/viewers', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Security: only the story author can see who viewed their story
    const story = await prisma.story.findUnique({ where: { id: req.params.id } });
    if (!story) return res.status(404).json({ error: { message: 'Story not found' } });
    if (story.authorId !== req.userId) return res.status(403).json({ error: { message: 'Access denied — only the author can view story viewers', code: 'FORBIDDEN' } });
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
  try { await prisma.story.delete({ where: { id: req.params.id, authorId: req.userId } }); auditLog(prisma, req.userId!, 'story_delete', { storyId: req.params.id }); res.json({ data: { success: true } }); } catch (e) { next(e); }
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
    const { title: rawTitle, description: rawDescription, url, thumbnailUrl, category, visibility } = req.body;
    const title = sanitize(rawTitle || '');
    const description = sanitize(rawDescription || '');
    const video = await prisma.video.create({ data: { authorId: req.userId!, title, description, url, thumbnailUrl, category: category || 'general', visibility: visibility || 'everyone' } });
    res.json({ data: video });
  } catch (e) { next(e); }
});

app.post('/api/v1/videos/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.videoReaction.findUnique({ where: { videoId_userId: { videoId: req.params.id, userId: req.userId! } } });
    if (existing) { await prisma.videoReaction.delete({ where: { id: existing.id } }); res.json({ data: { liked: false } }); }
    else { await prisma.videoReaction.create({ data: { videoId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } }); await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } }); trackActivity(prisma, req.userId!, 'like', 'video', req.params.id); res.json({ data: { liked: true } }); }
  } catch (e) { next(e); }
});

app.post('/api/v1/videos/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.videoComment.create({ data: { videoId: req.params.id, authorId: req.userId!, content: sanitize(req.body.content || '') }, include: { author: { select: { id: true, displayName: true } } } });
    trackActivity(prisma, req.userId!, 'comment', 'video', req.params.id);
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

    // 1. Build user interest profile from: their interests, their reaction history, their view history, AND their UserActivity data
    const userInterests = await prisma.profileInterest.findMany({ where: { userId }, select: { name: true } });
    const interestNames = userInterests.map(i => i.name.toLowerCase());

    // Recent reactions (last 100) — what has this user been liking?
    const recentReactions = await prisma.creativityReaction.findMany({
      where: { userId },
      include: { item: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // ── User Activity behavioral signals (what they view, how long, what they search) ──
    let activitySignals: { viewedCategories: Record<string, number>; searchTerms: string[]; dwellPatterns: Record<string, number> } = { viewedCategories: {}, searchTerms: [], dwellPatterns: {} };
    try {
      const recentActivities = await prisma.userActivity.findMany({
        where: { userId, targetType: { in: ['creativity', 'feed', 'video'] }, createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      for (const a of recentActivities) {
        const meta = a.metadata ? JSON.parse(a.metadata) : {};
        if (meta.category) {
          const weight = a.action === 'like' ? 3 : a.action === 'share' ? 4 : a.action === 'comment' ? 3 : 1;
          activitySignals.viewedCategories[meta.category] = (activitySignals.viewedCategories[meta.category] || 0) + weight;
        }
        if (a.action === 'search' && meta.query) activitySignals.searchTerms.push(meta.query);
        if (a.durationMs && a.targetId) {
          activitySignals.dwellPatterns[a.targetId] = (activitySignals.dwellPatterns[a.targetId] || 0) + a.durationMs;
        }
      }
    } catch {} // Graceful if UserActivity table isn't ready

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

    // ── Merge behavioral activity signals into category engagement ──
    for (const [cat, weight] of Object.entries(activitySignals.viewedCategories)) {
      categoryEngagement[cat] = (categoryEngagement[cat] || 0) + weight * 0.5;
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

    // 5. Score each candidate using algorithm engine
    // Build user profile for feed scoring
    const feedUserProfile: FeedUserProfile = {
      interestNames,
      categoryEngagement,
      followedAuthors: new Set<string>(), // TODO: populate from social graph
      activitySignals,
    };

    const scored = candidates.map(item => {
      const catName = item.category?.name || '';

      // Build FeedItem for algorithm engine
      const feedItem: FeedItem = {
        id: item.id,
        authorId: item.authorId,
        authorVerified: item.author.verified,
        authorFollowedByUser: feedUserProfile.followedAuthors.has(item.authorId),
        categoryName: catName,
        trendScore: item.trendScore,
        views: item.views,
        reactionCount: item._count.reactions,
        commentCount: item._count.comments,
        createdAt: item.createdAt,
        alreadyViewed: viewedIds.has(item.id),
      };

      // Use the algorithm engine for scoring
      const score = scoreFeedItem(feedItem, feedUserProfile);

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

    const { message: rawMoveMessage } = req.body;
    const message = rawMoveMessage ? sanitize(rawMoveMessage) : '';
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
    title = sanitize(title || '');
    content = sanitize(content || '');
    description = sanitize(description || '');
    if (category) category = sanitize(category);
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
    else {
      await prisma.creativityReaction.create({ data: { itemId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } });
      trackActivity(prisma, req.userId!, 'like', 'creativity', req.params.id);
      res.json({ data: { liked: true } });
    }
    await recalcTrend(req.params.id);
  } catch (e) { next(e); }
});

app.post('/api/v1/creativity/items/:id/comments', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.creativityComment.create({
      data: { itemId: req.params.id, authorId: req.userId!, content: sanitize(req.body.content || '') },
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
    trackActivity(prisma, req.userId!, 'view', 'creativity', req.params.id);
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
    const data = sanitizeObject(req.body);
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

    // Score each profile using DTM algorithm engine (enhanced with behavioral signals)
    const result = await Promise.all(profiles.map(async p => {
      const { phoneNumber, alternatePhone, linkedIn, contactEmail, ...safe } = p;

      // Build DTM scoring inputs
      let dtmScore: number | null = null;
      if (myProfile) {
        const myDtm: DtmUser = {
          religion: myProfile.religion || undefined, caste: myProfile.caste || undefined,
          gotra: myProfile.gotra || undefined, manglik: myProfile.manglik || undefined,
          motherTongue: myProfile.motherTongue || undefined, diet: myProfile.diet || undefined,
          education: myProfile.education || undefined, annualIncome: myProfile.annualIncome || undefined,
          workingCity: myProfile.workingCity || undefined, height: myProfile.height || undefined,
          bodyType: myProfile.bodyType || undefined, familyType: myProfile.familyType || undefined,
          familyValues: myProfile.familyValues || undefined,
          maritalStatus: myProfile.maritalStatus || undefined,
          partnerAgeMin: (myProfile as any).partnerAgeMin, partnerAgeMax: (myProfile as any).partnerAgeMax,
          partnerReligion: myProfile.partnerReligion || undefined, partnerCaste: myProfile.partnerCaste || undefined,
          userAge: p.user?.profile?.age,
        };
        const candDtm: DtmCandidate = {
          religion: p.religion || undefined, caste: p.caste || undefined,
          gotra: p.gotra || undefined, manglik: p.manglik || undefined,
          motherTongue: p.motherTongue || undefined, diet: p.diet || undefined,
          education: p.education || undefined, annualIncome: p.annualIncome || undefined,
          workingCity: p.workingCity || undefined, height: p.height || undefined,
          bodyType: p.bodyType || undefined, familyType: p.familyType || undefined,
          familyValues: p.familyValues || undefined,
          maritalStatus: p.maritalStatus || undefined,
          userAge: p.user?.profile?.age,
        };

        // Get behavioral signals for enhanced scoring
        let behavioralSignals = { profileCompleteness: 0.5, responseRateToRequests: 0.5, avgResponseTimeHrs: 48, browseOverlap: 0.3, activeDaysLast14: 3 };
        try {
          // Candidate profile completeness (how filled-out their DTM profile is)
          const fields = [p.religion, p.education, p.annualIncome, p.workingCity, p.height, p.diet, p.motherTongue, p.familyType, p.bodyType, p.aboutMe];
          behavioralSignals.profileCompleteness = fields.filter(Boolean).length / fields.length;
          // Recently active (user was online in last 48h) → approximate activeDaysLast14
          const recentlyActive = !!(p.user?.profile as any)?.online || (p.updatedAt > new Date(Date.now() - 48 * 3600000));
          behavioralSignals.activeDaysLast14 = recentlyActive ? 7 : 2;
          // View count as a proxy for engagement/overlap
          const viewCount = await prisma.userActivity.count({ where: { targetId: p.userId, action: 'view', targetType: 'dtm_profile', createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } });
          behavioralSignals.browseOverlap = Math.min(viewCount / 10, 1);
        } catch {}

        const staticScore = scoreDtm(myDtm, candDtm);
        dtmScore = scoreDtmEnhanced(staticScore, behavioralSignals);
      }

      return {
        ...safe,
        hasPhone: !!phoneNumber,
        hasLinkedIn: !!linkedIn,
        hasEmail: !!contactEmail,
        dtmScore,
      };
    }));

    // Sort by DTM score if available
    if (myProfile) {
      result.sort((a, b) => (b.dtmScore || 0) - (a.dtmScore || 0));
    }

    // Track DTM browse activity for behavioral scoring
    for (const p of result.slice(0, 5)) {
      trackActivity(prisma, req.userId!, 'view', 'dtm_profile', p.userId, { dtmScore: p.dtmScore });
    }

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
    const { targetUserId, accessType, message: rawAccessMessage } = req.body;
    const message = rawAccessMessage ? sanitize(rawAccessMessage) : '';
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

      // DTM scoring for matches
      const myDtm: DtmUser = {
        religion: myProfile.religion || undefined, caste: myProfile.caste || undefined,
        gotra: myProfile.gotra || undefined, manglik: myProfile.manglik || undefined,
        motherTongue: myProfile.motherTongue || undefined, diet: myProfile.diet || undefined,
        education: myProfile.education || undefined, annualIncome: myProfile.annualIncome || undefined,
        workingCity: myProfile.workingCity || undefined, familyType: myProfile.familyType || undefined,
        familyValues: myProfile.familyValues || undefined, maritalStatus: myProfile.maritalStatus || undefined,
        partnerReligion: myProfile.partnerReligion || undefined, partnerCaste: myProfile.partnerCaste || undefined,
        userAge: p.user?.profile?.age,
      };
      const candDtm: DtmCandidate = {
        religion: p.religion || undefined, caste: p.caste || undefined,
        gotra: p.gotra || undefined, manglik: p.manglik || undefined,
        motherTongue: p.motherTongue || undefined, diet: p.diet || undefined,
        education: p.education || undefined, annualIncome: p.annualIncome || undefined,
        workingCity: p.workingCity || undefined, familyType: p.familyType || undefined,
        familyValues: p.familyValues || undefined, maritalStatus: p.maritalStatus || undefined,
        userAge: p.user?.profile?.age,
      };
      const dtmScore = scoreDtm(myDtm, candDtm);

      return { ...safe, hasPhone: !!phoneNumber, hasLinkedIn: !!linkedIn, hasEmail: !!contactEmail, dtmScore };
    });

    // Sort by DTM compatibility score descending
    result.sort((a, b) => (b.dtmScore || 0) - (a.dtmScore || 0));
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
    { id: 'vedic-sunrise', name: 'Vedic Sunrise', description: 'Warm saffron & red with Sanskrit motifs', colors: ['#FF6600', '#8B0000', '#FFF5EE'], premium: false },
    { id: 'lotus-pond', name: 'Lotus Pond', description: 'Soft pink & green like a lotus in bloom', colors: ['#FFB6C1', '#228B22', '#FFF0F5'], premium: false },
    { id: 'temple-gold', name: 'Temple Gold', description: 'Pure gold & dark wood like ancient temples', colors: ['#B8860B', '#2F1B0E', '#FDF5E6'], premium: true },
    { id: 'peacock-pride', name: 'Peacock Pride', description: 'Iridescent peacock blue & green with feather motifs', colors: ['#0047AB', '#00A86B', '#E0FFFF'], premium: false },
    { id: 'bridal-red', name: 'Bridal Red', description: 'Auspicious marriage red with gold embellishments', colors: ['#CC0000', '#FFD700', '#FFF0F0'], premium: false },
    { id: 'sandalwood', name: 'Sandalwood Classic', description: 'Earthy warm tones like sandalwood & turmeric', colors: ['#C19A6B', '#E8B04B', '#FAEBD7'], premium: false },
    { id: 'celestial-blue', name: 'Celestial Blue', description: 'Night sky blue with silver star patterns', colors: ['#191970', '#C0C0C0', '#F0F8FF'], premium: true },
    { id: 'marigold-festive', name: 'Marigold Festive', description: 'Bright marigold orange & green festive celebration', colors: ['#FFA500', '#228B22', '#FFFFF0'], premium: false },
    { id: 'ivory-elegance', name: 'Ivory Elegance', description: 'Sophisticated ivory & champagne with subtle gold', colors: ['#FFFFF0', '#F7E7CE', '#D4AF37'], premium: false },
    { id: 'rajwada-heritage', name: 'Rajwada Heritage', description: 'Deep purple & gold like royal palaces', colors: ['#4B0082', '#FFD700', '#F8F0FF'], premium: true },
    { id: 'tulsi-green', name: 'Tulsi Green', description: 'Sacred tulsi green with earthy touches', colors: ['#2E8B57', '#8B4513', '#F0FFF0'], premium: false },
    { id: 'diwali-lights', name: 'Diwali Lights', description: 'Sparkling colors of Diwali celebration', colors: ['#FF4500', '#FFD700', '#1A0033'], premium: true },
  ];
  res.json({ data: templates });
});

/* ═══════════════════════════════════════════════════
   ADVANCED NUMEROLOGY ENGINE (Pythagorean + Vedic)
   ═══════════════════════════════════════════════════ */
function calculateNumerology(dateOfBirth: string, birthTime?: string) {
  if (!dateOfBirth) return null;
  const d = new Date(dateOfBirth);
  const day = d.getDate(); const month = d.getMonth() + 1; const year = d.getFullYear();
  const reduceToSingle = (n: number): number => {
    while (n > 9 && n !== 11 && n !== 22 && n !== 33) { n = String(n).split('').reduce((s, c) => s + parseInt(c), 0); }
    return n;
  };
  // Pythagorean method: reduce each component separately then add
  const dayReduced = reduceToSingle(day);
  const monthReduced = reduceToSingle(month);
  const yearReduced = reduceToSingle(year);
  const lifePath = reduceToSingle(dayReduced + monthReduced + yearReduced);
  const destiny = reduceToSingle(day); // Birth Day number (Mulank)
  const soul = reduceToSingle(day + month); // Bhagyank
  // Personal Year cycle
  const currentYear = new Date().getFullYear();
  const personalYear = reduceToSingle(day + month + reduceToSingle(currentYear));
  // Karmic Debt detection
  const karmicDebtNumbers = [13, 14, 16, 19];
  const rawLifePath = dayReduced + monthReduced + yearReduced;
  const hasKarmicDebt = karmicDebtNumbers.includes(rawLifePath) || karmicDebtNumbers.includes(day);
  const karmicLesson = hasKarmicDebt ? (rawLifePath === 13 ? 'Hard work & discipline needed' : rawLifePath === 14 ? 'Balance freedom with responsibility' : rawLifePath === 16 ? 'Rebuild ego through humility' : 'Independence without ego') : null;
  // Birth time influence (Vedic hora)
  let horaInfluence = '';
  if (birthTime) {
    const parts = birthTime.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (parts) {
      let hour = parseInt(parts[1]);
      if (parts[3]?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (parts[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      const horaLord = ['Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon'][(hour % 7)];
      horaInfluence = horaLord;
    }
  }
  const PLANETS: Record<number, string> = { 1: 'Sun (Surya)', 2: 'Moon (Chandra)', 3: 'Jupiter (Guru)', 4: 'Rahu (North Node)', 5: 'Mercury (Budh)', 6: 'Venus (Shukra)', 7: 'Ketu (South Node)', 8: 'Saturn (Shani)', 9: 'Mars (Mangal)', 11: 'Uranus (Higher Moon)', 22: 'Pluto (Higher Saturn)', 33: 'Neptune (Higher Jupiter)' };
  const COLORS: Record<number, string[]> = { 1: ['Gold', 'Saffron', 'Orange'], 2: ['White', 'Pearl', 'Cream'], 3: ['Yellow', 'Purple', 'Violet'], 4: ['Blue', 'Electric Blue', 'Grey'], 5: ['Green', 'Turquoise', 'White'], 6: ['Pink', 'Royal Blue', 'Lavender'], 7: ['White', 'Light Green', 'Silver'], 8: ['Black', 'Dark Purple', 'Navy'], 9: ['Red', 'Crimson', 'Maroon'], 11: ['Silver', 'Iridescent'], 22: ['Gold', 'Earth Tones'], 33: ['Turquoise', 'Emerald'] };
  const COMPAT: Record<number, number[]> = { 1: [1,2,3,5,9], 2: [1,2,4,6,7,8], 3: [1,3,5,6,9], 4: [2,4,6,8], 5: [1,3,5,7,9], 6: [2,3,4,6,8,9], 7: [2,5,7], 8: [2,4,6,8], 9: [1,3,5,6,9] };
  const TRAITS: Record<number, string[]> = { 1: ['Natural Leader','Independent','Pioneering','Ambitious','Self-reliant'], 2: ['Diplomatic','Sensitive','Cooperative','Peacemaker','Intuitive'], 3: ['Creative','Optimistic','Social','Expressive','Joyful'], 4: ['Practical','Disciplined','Hardworking','Builder','Reliable'], 5: ['Adventurous','Free-spirited','Dynamic','Versatile','Explorer'], 6: ['Nurturing','Responsible','Caring','Harmonious','Protective'], 7: ['Spiritual','Analytical','Introverted','Seeker','Wise'], 8: ['Powerful','Authoritative','Material Success','Strategic','Achiever'], 9: ['Compassionate','Selfless','Humanitarian','Global','Generous'], 11: ['Visionary','Highly Intuitive','Inspirational','Spiritual Teacher'], 22: ['Master Builder','Practical Visionary','Architect of Dreams'], 33: ['Master Healer','Compassionate Guide','Universal Love'] };
  const GEMS: Record<number, string> = { 1: 'Ruby (Manikya)', 2: 'Pearl (Moti)', 3: 'Yellow Sapphire (Pukhraj)', 4: 'Hessonite (Gomed)', 5: 'Emerald (Panna)', 6: 'Diamond (Heera)', 7: "Cat's Eye (Lehsunia)", 8: 'Blue Sapphire (Neelam)', 9: 'Red Coral (Moonga)' };
  const MANTRAS: Record<number, string> = { 1: 'Om Suryaya Namaha', 2: 'Om Chandraya Namaha', 3: 'Om Gurave Namaha', 4: 'Om Rahave Namaha', 5: 'Om Budhaya Namaha', 6: 'Om Shukraya Namaha', 7: 'Om Ketave Namaha', 8: 'Om Shanaye Namaha', 9: 'Om Mangalaya Namaha' };
  const base = lifePath > 9 ? ((lifePath - 1) % 9 + 1) : lifePath;
  return {
    lifePath, destiny, soul, personalYear, hasKarmicDebt, karmicLesson,
    rulingPlanet: PLANETS[lifePath] || PLANETS[base] || 'Unknown',
    horaLord: horaInfluence || null,
    luckyColors: COLORS[lifePath] || COLORS[base] || ['Gold'],
    traits: TRAITS[lifePath] || TRAITS[base] || ['Balanced'],
    compatibleNumbers: COMPAT[base] || [],
    luckyGem: GEMS[base] || 'Quartz',
    mantra: MANTRAS[base] || 'Om Namah Shivaya',
    luckyDay: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][base % 7],
    elementalEnergy: base <= 3 ? 'Fire (Agni)' : base <= 6 ? 'Earth (Prithvi)' : 'Water (Jal)',
    birthDay: day, birthMonth: month, birthYear: year
  };
}

app.get('/api/v1/matrimonial/numerology', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile?.dateOfBirth) return res.json({ data: null, message: 'Date of birth required' });
    const result = calculateNumerology(profile.dateOfBirth.toISOString(), profile.birthTime);
    if (result) { await prisma.matrimonialProfile.update({ where: { userId: req.userId! }, data: { numerologyNumber: result.lifePath, destinyNumber: result.destiny, soulNumber: result.soul } }); }
    res.json({ data: result });
  } catch (e) { next(e); }
});

app.get('/api/v1/matrimonial/numerology/compatibility/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    const otherProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.params.userId } });
    if (!myProfile?.dateOfBirth || !otherProfile?.dateOfBirth) return res.json({ data: null, message: 'Both need DOB' });
    const myN = calculateNumerology(myProfile.dateOfBirth.toISOString()), otherN = calculateNumerology(otherProfile.dateOfBirth.toISOString());
    if (!myN || !otherN) return res.json({ data: null });
    const myBase = myN.lifePath > 9 ? ((myN.lifePath-1)%9+1) : myN.lifePath, otherBase = otherN.lifePath > 9 ? ((otherN.lifePath-1)%9+1) : otherN.lifePath;
    let score = 50; const reasons: string[] = [];
    if (myN.compatibleNumbers.includes(otherBase)) { score += 25; reasons.push(`Life Path ${myN.lifePath} & ${otherN.lifePath} compatible`); }
    if (myN.destiny === otherN.destiny) { score += 15; reasons.push('Same destiny number'); }
    if (myN.soul === otherN.soul) { score += 10; reasons.push('Soul alignment'); }
    if ([11,22,33].includes(myN.lifePath) || [11,22,33].includes(otherN.lifePath)) { score += 5; reasons.push('Master number present'); }
    score = Math.min(99, Math.max(20, score));
    res.json({ data: { score, myNumerology: myN, partnerNumerology: otherN, reasons, analysis: score >= 80 ? 'Excellent compatibility!' : score >= 60 ? 'Good match.' : score >= 40 ? 'Moderate compatibility.' : 'Different energies.' } });
  } catch (e) { next(e); }
});

/* ═══════════════════════════════════════════════════
   KUNDLI / HOROSCOPE COMPATIBILITY (Full Ashtakoota with proper 8-koot scoring)
   ═══════════════════════════════════════════════════ */
function analyzeKundliCompatibility(p1: any, p2: any) {
  let total = 0; const koots: any[] = [];
  const NAKSHATRAS = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Moola','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];

  // Get nakshatra indices
  const n1 = NAKSHATRAS.indexOf(p1.star || p1.nakshatra || '');
  const n2 = NAKSHATRAS.indexOf(p2.star || p2.nakshatra || '');

  // 1. VARNA (1 point) — Spiritual compatibility based on nakshatra-derived varna
  const getNakshatraVarna = (nIdx: number) => { if (nIdx < 0) return 3; return Math.floor(nIdx / 7) % 4; }; // 0=Brahmin,1=Kshatriya,2=Vaishya,3=Shudra
  const v1 = getNakshatraVarna(n1), v2 = getNakshatraVarna(n2);
  const vs = v1 >= v2 ? 1 : 0;
  koots.push({ name: 'Varna', max: 1, score: vs, desc: 'Spiritual development & ego compatibility' }); total += vs;

  // 2. VASHYA (2 points) — Control/dominance using nakshatra animal groups
  const VASHYA_GROUPS = ['Chatushpada','Manushya','Jalachara','Vanachara','Keeta']; // 4-legged, human, water, forest, insect
  const getVashyaGroup = (nIdx: number): number => { if (nIdx < 0) return 1; const groups = [0,1,0,1,3,1,1,0,4,0,1,1,3,4,3,3,1,1,0,1,1,1,0,2,1,0,2]; return groups[nIdx % 27]; };
  const vg1 = getVashyaGroup(n1), vg2 = getVashyaGroup(n2);
  const vashyaScore = vg1 === vg2 ? 2 : (vg1 === 1 || vg2 === 1) ? 1 : Math.abs(vg1 - vg2) <= 1 ? 1 : 0;
  koots.push({ name: 'Vashya', max: 2, score: vashyaScore, desc: 'Mutual attraction & influence' }); total += vashyaScore;

  // 3. TARA (3 points) — Birth star compatibility (Dina Koota)
  let taraScore = 1;
  if (n1 >= 0 && n2 >= 0) {
    const diff = ((n2 - n1 + 27) % 27) + 1;
    const tara = ((diff - 1) % 9) + 1; // 1-9 cycle
    // Tara 3,5,7 are inauspicious; 1,2,4,6,8,9 are auspicious
    taraScore = [3, 5, 7].includes(tara) ? 0 : 3;
  }
  koots.push({ name: 'Tara', max: 3, score: taraScore, desc: 'Health, longevity & destiny' }); total += taraScore;

  // 4. YONI (4 points) — Physical/sexual compatibility (14 animal types from nakshatras)
  const YONI_ANIMALS = ['Horse','Elephant','Sheep','Serpent','Dog','Cat','Rat','Cow','Buffalo','Tiger','Deer','Monkey','Mongoose','Lion'];
  const getNakshatraYoni = (nIdx: number): number => { if (nIdx < 0) return 0; const yoniMap = [0,1,2,3,3,4,5,2,5,6,6,7,8,9,8,9,10,10,4,11,11,12,0,0,13,7,1]; return yoniMap[nIdx % 27]; };
  const y1 = getNakshatraYoni(n1), y2 = getNakshatraYoni(n2);
  // Same yoni = 4, friendly = 3, neutral = 2, unfriendly = 1, enemy = 0
  const YONI_ENEMIES: [number,number][] = [[0,8],[1,13],[2,12],[3,11],[4,10],[5,6],[7,9]]; // natural enemies
  let yoniScore = 2; // default neutral
  if (y1 === y2) yoniScore = 4;
  else if (YONI_ENEMIES.some(([a,b]) => (y1===a && y2===b) || (y1===b && y2===a))) yoniScore = 0;
  else if (Math.abs(y1 - y2) <= 2) yoniScore = 3;
  else yoniScore = 1;
  koots.push({ name: 'Yoni', max: 4, score: yoniScore, desc: 'Physical & intimate compatibility' }); total += yoniScore;

  // 5. GRAHA MAITRI (5 points) — Mental compatibility based on Rashi lords
  const RAASHIS = ['Mesha (Aries)','Vrishabha (Taurus)','Mithuna (Gemini)','Karka (Cancer)','Simha (Leo)','Kanya (Virgo)','Tula (Libra)','Vrischika (Scorpio)','Dhanu (Sagittarius)','Makara (Capricorn)','Kumbha (Aquarius)','Meena (Pisces)'];
  const RASHI_LORDS = [4,5,2,1,0,2,5,4,3,6,6,3]; // Mars,Venus,Mercury,Moon,Sun,Mercury,Venus,Mars,Jupiter,Saturn,Saturn,Jupiter → mapped to 0-6
  const r1 = RAASHIS.indexOf(p1.raasi || ''), r2 = RAASHIS.indexOf(p2.raasi || '');
  let grahaMaitriScore = 3; // default average
  if (r1 >= 0 && r2 >= 0) {
    const lord1 = RASHI_LORDS[r1], lord2 = RASHI_LORDS[r2];
    if (lord1 === lord2) grahaMaitriScore = 5; // same lord
    else {
      // Planetary friendship table (simplified): Sun+Moon+Mars+Jupiter = friends, Saturn+Venus+Mercury = friends
      const group1 = [0,1,4,3], group2 = [6,5,2];
      const sameGroup = (group1.includes(lord1) && group1.includes(lord2)) || (group2.includes(lord1) && group2.includes(lord2));
      grahaMaitriScore = sameGroup ? 4 : Math.abs(lord1 - lord2) <= 1 ? 3 : 1;
    }
  }
  koots.push({ name: 'Graha Maitri', max: 5, score: grahaMaitriScore, desc: 'Mental wavelength & friendship' }); total += grahaMaitriScore;

  // 6. GANA (6 points) — Temperament (Deva, Manushya, Rakshasa from nakshatra)
  const getNakshatraGana = (nIdx: number): number => { if (nIdx < 0) return 1; const ganaMap = [0,1,2,0,0,1,0,0,2,2,1,0,0,2,0,2,0,2,2,0,1,0,2,2,1,0,1]; return ganaMap[nIdx % 27]; }; // 0=Deva, 1=Manushya, 2=Rakshasa
  const g1 = getNakshatraGana(n1), g2 = getNakshatraGana(n2);
  let ganaScore = 0;
  if (g1 === g2) ganaScore = 6;
  else if ((g1 === 0 && g2 === 1) || (g1 === 1 && g2 === 0)) ganaScore = 5;
  else if (g1 === 1 && g2 === 2 || g2 === 1 && g1 === 2) ganaScore = 1;
  else ganaScore = 0; // Deva-Rakshasa
  koots.push({ name: 'Gana', max: 6, score: ganaScore, desc: 'Temperament & behavior compatibility' }); total += ganaScore;

  // 7. BHAKOOT (7 points) — Love, family harmony (based on Rashi distance)
  let bhakootScore = 7;
  if (r1 >= 0 && r2 >= 0) {
    const diff = ((r2 - r1 + 12) % 12) + 1;
    const reverseDiff = ((r1 - r2 + 12) % 12) + 1;
    // Inauspicious combinations: 2/12, 5/9, 6/8
    if ((diff === 2 && reverseDiff === 12) || (diff === 12 && reverseDiff === 2)) bhakootScore = 0;
    else if ((diff === 6 && reverseDiff === 8) || (diff === 8 && reverseDiff === 6)) bhakootScore = 0;
    else if ((diff === 5 && reverseDiff === 9) || (diff === 9 && reverseDiff === 5)) bhakootScore = 0;
    else bhakootScore = 7;
  }
  koots.push({ name: 'Bhakoot', max: 7, score: bhakootScore, desc: 'Love, harmony & financial prosperity' }); total += bhakootScore;

  // 8. NADI (8 points) — Most important! Health & genetics (from nakshatra)
  const getNakshatraNadi = (nIdx: number): string => {
    if (nIdx < 0) return 'Madhya';
    const nadiMap = ['Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya','Aadi','Madhya','Antya'];
    return nadiMap[nIdx % 27];
  };
  const nadi1 = getNakshatraNadi(n1), nadi2 = getNakshatraNadi(n2);
  const nadiScore = nadi1 !== nadi2 ? 8 : 0; // Same nadi = 0 points (Nadi Dosha)
  koots.push({ name: 'Nadi', max: 8, score: nadiScore, desc: 'Progeny health & genetic compatibility (most critical)' }); total += nadiScore;

  const pct = Math.round((total / 36) * 100);
  const manglikWarning = (p1.manglik === 'Yes' && p2.manglik !== 'Yes') || (p2.manglik === 'Yes' && p1.manglik !== 'Yes');
  const gotraConflict = p1.gotra && p2.gotra && p1.gotra.toLowerCase() === p2.gotra.toLowerCase();
  const nadiDosha = nadiScore === 0;

  // Detailed verdict
  let verdict = '', level = '';
  if (pct >= 75) { verdict = 'Excellent Match — शुभ विवाह! Highly recommended for marriage.'; level = 'excellent'; }
  else if (pct >= 55) { verdict = 'Good Match — विवाह योग्य। Auspicious with minor remedies.'; level = 'good'; }
  else if (pct >= 40) { verdict = 'Average Match — Consider with proper astrological remedies.'; level = 'average'; }
  else { verdict = 'Below Average — Detailed analysis needed before proceeding.'; level = 'low'; }

  // Additional insights
  const insights: string[] = [];
  if (nadiDosha) insights.push('⚠️ Nadi Dosha present — consult pandit for remedies (Nadi Nivaran Puja)');
  if (bhakootScore === 0) insights.push('⚠️ Bhakoot Dosha — may affect financial harmony, remedies available');
  if (ganaScore <= 1) insights.push('Different temperaments — communication & patience key');
  if (yoniScore >= 4) insights.push('✨ Excellent physical compatibility indicated');
  if (grahaMaitriScore >= 4) insights.push('✨ Strong mental wavelength — intellectual bond');
  if (total >= 25) insights.push('✨ Above 25 Gunas — very auspicious for marriage');

  return { totalPoints: total, maxPoints: 36, percentage: pct, koots, manglikWarning, gotraConflict, nadiDosha, verdict, level, insights };
}

app.get('/api/v1/matrimonial/compatibility/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    const otherProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.params.userId } });
    if (!myProfile || !otherProfile) return res.status(404).json({ error: { message: 'Profile not found' } });
    const kundli = analyzeKundliCompatibility(myProfile, otherProfile);
    let numResult: any = null;
    if (myProfile.dateOfBirth && otherProfile.dateOfBirth) {
      const myN = calculateNumerology(myProfile.dateOfBirth.toISOString()), oN = calculateNumerology(otherProfile.dateOfBirth.toISOString());
      if (myN && oN) { const ob = oN.lifePath>9?((oN.lifePath-1)%9+1):oN.lifePath; let s=50; if(myN.compatibleNumbers.includes(ob))s+=25; if(myN.destiny===oN.destiny)s+=15; if(myN.soul===oN.soul)s+=10; numResult={score:Math.min(99,s),myNumber:myN.lifePath,partnerNumber:oN.lifePath}; }
    }
    const composite = Math.min(99, Math.round(kundli.percentage*0.6 + (numResult?.score||50)*0.2 + (myProfile.religion===otherProfile.religion?10:0) + (myProfile.gotra&&otherProfile.gotra&&myProfile.gotra.toLowerCase()!==otherProfile.gotra.toLowerCase()?5:0) + (!kundli.manglikWarning?5:0)));
    res.json({ data: { compositeScore: composite, kundli, numerology: numResult, partnerName: otherProfile.fullName, partnerUserId: otherProfile.userId, insights: kundli.insights || [] } });
  } catch (e) { next(e); }
});

app.post('/api/v1/matrimonial/kundli', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { kundliUrl, kundliData, nakshatra } = req.body;
    const profile = await prisma.matrimonialProfile.update({ where: { userId: req.userId! }, data: { ...(kundliUrl!==undefined?{kundliUrl}:{}), ...(kundliData!==undefined?{kundliData:typeof kundliData==='string'?kundliData:JSON.stringify(kundliData)}:{}), ...(nakshatra!==undefined?{nakshatra}:{}) } });
    res.json({ data: profile });
  } catch (e) { next(e); }
});

app.get('/api/v1/matrimonial/browse/advanced', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { religion, caste, city, education, income, manglik, maritalStatus, diet, motherTongue, minAge, maxAge, complexion, bodyType, gotra, numerologyMatch, sortBy, cursor } = req.query;
    const where: any = { userId: { not: req.userId! }, fullName: { not: '' } };
    if (religion) where.religion = { equals: religion as string, mode: 'insensitive' };
    if (caste) where.caste = { equals: caste as string, mode: 'insensitive' };
    if (city) where.workingCity = { contains: city as string, mode: 'insensitive' };
    if (education) where.education = { contains: education as string, mode: 'insensitive' };
    if (income) where.annualIncome = { not: '' };
    if (manglik && manglik !== 'any') where.manglik = manglik as string;
    if (maritalStatus) where.maritalStatus = maritalStatus as string;
    if (diet) where.diet = diet as string;
    if (motherTongue) where.motherTongue = { equals: motherTongue as string, mode: 'insensitive' };
    if (complexion) where.complexion = complexion as string;
    if (bodyType) where.bodyType = bodyType as string;
    if (gotra) where.gotra = { not: gotra as string };
    const profiles = await prisma.matrimonialProfile.findMany({ where, include: { user: { select: { id: true, displayName: true, username: true, verified: true, profile: { select: { age: true, gender: true, city: true, profession: true, avatarGradient: true, online: true, bio: true } }, photos: { take: 3, orderBy: { position: 'asc' } } } } }, orderBy: { updatedAt: 'desc' }, take: 40, ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}) });
    let filtered = profiles;
    if (minAge) filtered = filtered.filter(p => (p.user?.profile?.age || 0) >= parseInt(minAge as string));
    if (maxAge) filtered = filtered.filter(p => (p.user?.profile?.age || 99) <= parseInt(maxAge as string));
    // Height filtering (parse height like 5'6" to inches for comparison)
    const parseHeight = (h: string): number => { const m = h?.match(/(\d+)'(\d+)/); return m ? parseInt(m[1]) * 12 + parseInt(m[2]) : 0; };
    const { minHeight, maxHeight, minWeight, maxWeight } = req.query;
    if (minHeight) { const minH = parseHeight(minHeight as string); filtered = filtered.filter(p => parseHeight(p.height || '') >= minH); }
    if (maxHeight) { const maxH = parseHeight(maxHeight as string); filtered = filtered.filter(p => { const h = parseHeight(p.height || ''); return h === 0 || h <= maxH; }); }
    if (minWeight) { const minW = parseInt(minWeight as string); filtered = filtered.filter(p => { const w = parseInt(p.weight || '0'); return w >= minW; }); }
    if (maxWeight) { const maxW = parseInt(maxWeight as string); filtered = filtered.filter(p => { const w = parseInt(p.weight || '0'); return w === 0 || w <= maxW; }); }
    const myProfile = await prisma.matrimonialProfile.findUnique({ where: { userId: req.userId! } });
    let myN: any = null;
    if (myProfile?.dateOfBirth) myN = calculateNumerology(myProfile.dateOfBirth.toISOString());
    const result = filtered.map(p => { const { phoneNumber, alternatePhone, linkedIn, contactEmail, ...safe } = p; let ns: number|null = null; if (myN && p.dateOfBirth) { const pN = calculateNumerology(p.dateOfBirth.toISOString()); if (pN) { const pb = pN.lifePath>9?((pN.lifePath-1)%9+1):pN.lifePath; ns = myN.compatibleNumbers.includes(pb)?85:50; } } return { ...safe, hasPhone: !!phoneNumber, hasLinkedIn: !!linkedIn, hasEmail: !!contactEmail, numerologyScore: ns }; });
    let final = result;
    if (numerologyMatch === 'true' && myN) final = result.filter(p => (p.numerologyScore||0) >= 70);
    if (sortBy === 'numerology') final.sort((a, b) => (b.numerologyScore||0) - (a.numerologyScore||0));
    res.json({ data: final, total: final.length, cursor: profiles[profiles.length-1]?.id });
  } catch (e) { next(e); }
});

// DTM Chat (persistent — stored in DtmMessage table)
app.post('/api/v1/matrimonial/chat/send', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { recipientId, message: rawDtmMessage, type = 'text' } = req.body;
    if (!recipientId || !rawDtmMessage) return res.status(400).json({ error: { message: 'recipientId and message are required' } });
    const message = sanitize(rawDtmMessage);
    const msg = await prisma.dtmMessage.create({
      data: { senderId: req.userId!, recipientId, message, type },
    });
    res.json({ data: msg });
  } catch (e) { next(e); }
});
app.get('/api/v1/matrimonial/chat/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const otherId = req.params.userId;
    // Fetch all messages between these two users
    const msgs = await prisma.dtmMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: otherId },
          { senderId: otherId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    // Mark unread messages as read
    await prisma.dtmMessage.updateMany({
      where: { senderId: otherId, recipientId: userId, read: false },
      data: { read: true },
    });
    res.json({ data: msgs });
  } catch (e) { next(e); }
});
app.get('/api/v1/matrimonial/chat', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    // Get all unique chat partners
    const sentTo = await prisma.dtmMessage.findMany({
      where: { senderId: userId },
      distinct: ['recipientId'],
      select: { recipientId: true },
    });
    const receivedFrom = await prisma.dtmMessage.findMany({
      where: { recipientId: userId },
      distinct: ['senderId'],
      select: { senderId: true },
    });
    const partnerIds = [...new Set([
      ...sentTo.map(m => m.recipientId),
      ...receivedFrom.map(m => m.senderId),
    ])];

    const chats = await Promise.all(partnerIds.map(async (partnerId) => {
      const lastMessage = await prisma.dtmMessage.findFirst({
        where: { OR: [{ senderId: userId, recipientId: partnerId }, { senderId: partnerId, recipientId: userId }] },
        orderBy: { createdAt: 'desc' },
      });
      const unreadCount = await prisma.dtmMessage.count({
        where: { senderId: partnerId, recipientId: userId, read: false },
      });
      const totalMessages = await prisma.dtmMessage.count({
        where: { OR: [{ senderId: userId, recipientId: partnerId }, { senderId: partnerId, recipientId: userId }] },
      });
      return { userId: partnerId, lastMessage, unreadCount, totalMessages };
    }));
    // Sort by last message time
    chats.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    res.json({ data: chats });
  } catch (e) { next(e); }
});

// Error Handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const error = err as { statusCode?: number; message?: string; code?: string };
  // Prisma FK violation on userId means the user's session is stale (deleted after reseed)
  if (error?.code === 'P2003' && error?.message?.includes('userId')) {
    return res.status(401).json({ error: { message: 'Session expired — please log in again', code: 'UNAUTHORIZED', statusCode: 401 } });
  }
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : (error.message || 'Internal server error');
  if (statusCode >= 500) logger.error('Unhandled error:', error.message);
  res.status(statusCode).json({ error: { message, code: error.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => { logger.info(`Miamo Content Service on port ${PORT}`); });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down content service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Content service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
