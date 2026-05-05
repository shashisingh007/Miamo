// ─── Creativity Routes ───────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const creativityRouter = Router();

// Get categories
creativityRouter.get('/categories', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.creativityCategory.findMany({
      include: { _count: { select: { items: true } } },
    });
    res.json({ data: categories });
  } catch (e) { next(e); }
});

// Get items (with sorting/filtering)
creativityRouter.get('/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
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
      where,
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        category: true,
        reactions: true,
        _count: { select: { reactions: true, comments: true, viewRecords: true } },
      },
      orderBy,
      take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const userId = req.userId!;
    const result = items.map(i => {
      const { passwordHash, ...author } = i.author;
      return {
        ...i, author,
        liked: i.reactions.some(r => r.userId === userId),
        likeCount: i._count.reactions,
        commentCount: i._count.comments,
        viewCount: i._count.viewRecords,
      };
    });

    res.json({ data: result, cursor: items[items.length - 1]?.id });
  } catch (e) { next(e); }
});

// Create item
creativityRouter.post('/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { categoryId, type, title, content, mediaUrl, visibility, featured } = req.body;
    const item = await prisma.creativityItem.create({
      data: { authorId: req.userId!, categoryId, type: type || 'text', title, content, mediaUrl, visibility: visibility || 'everyone', featured: featured || false },
      include: { category: true, author: { include: { profile: true } } },
    });
    res.json({ data: item });
  } catch (e) { next(e); }
});

// React to item
creativityRouter.post('/items/:id/react', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.creativityReaction.findUnique({
      where: { itemId_userId: { itemId: req.params.id, userId: req.userId! } },
    });
    if (existing) {
      await prisma.creativityReaction.delete({ where: { id: existing.id } });
      res.json({ data: { liked: false } });
    } else {
      await prisma.creativityReaction.create({ data: { itemId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } });
      res.json({ data: { liked: true } });
    }
    // Recalculate trend score
    await recalcTrend(req.params.id);
  } catch (e) { next(e); }
});

// Comment on item
creativityRouter.post('/items/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.creativityComment.create({
      data: { itemId: req.params.id, authorId: req.userId!, content: req.body.content },
      include: { author: { select: { id: true, displayName: true } } },
    });
    await recalcTrend(req.params.id);
    res.json({ data: comment });
  } catch (e) { next(e); }
});

creativityRouter.get('/items/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.creativityComment.findMany({
      where: { itemId: req.params.id },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

// View item
creativityRouter.post('/items/:id/view', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.creativityView.upsert({
      where: { itemId_viewerId: { itemId: req.params.id, viewerId: req.userId! } },
      create: { itemId: req.params.id, viewerId: req.userId! },
      update: {},
    });
    await prisma.creativityItem.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    await recalcTrend(req.params.id);
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Trends
creativityRouter.get('/trends', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;
    const where: any = {};
    if (category && category !== 'all') where.category = category;

    const trends = await prisma.trend.findMany({
      where,
      orderBy: category ? { categoryRank: 'asc' } : { rank: 'asc' },
      take: 50,
    });

    // Enrich with item data
    const enriched = await Promise.all(trends.map(async (t) => {
      const item = await prisma.creativityItem.findUnique({
        where: { id: t.itemId },
        include: {
          author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
          category: true,
        },
      });
      if (!item) return null;
      const { passwordHash, ...author } = item.author;
      return { ...t, item: { ...item, author } };
    }));

    res.json({ data: enriched.filter(Boolean) });
  } catch (e) { next(e); }
});

// Recalculate trend score
async function recalcTrend(itemId: string) {
  try {
    const item = await prisma.creativityItem.findUnique({
      where: { id: itemId },
      include: { reactions: true, comments: true, viewRecords: true, category: true },
    });
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
