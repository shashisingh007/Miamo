// ─── Videos Routes ───────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const videosRouter = Router();

videosRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { category, cursor } = req.query;
    const where: any = { visibility: 'everyone' };
    if (category && category !== 'all') where.category = category;

    const videos = await prisma.video.findMany({
      where,
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        reactions: true,
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const userId = req.userId!;
    const result = videos.map(v => {
      const { passwordHash, ...author } = v.author;
      return { ...v, author, liked: v.reactions.some(r => r.userId === userId), likeCount: v._count.reactions, commentCount: v._count.comments };
    });

    res.json({ data: result, cursor: videos[videos.length - 1]?.id });
  } catch (e) { next(e); }
});

videosRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, url, thumbnailUrl, category, visibility } = req.body;
    const video = await prisma.video.create({
      data: { authorId: req.userId!, title, description, url, thumbnailUrl, category: category || 'general', visibility: visibility || 'everyone' },
    });
    res.json({ data: video });
  } catch (e) { next(e); }
});

videosRouter.post('/:id/react', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.videoReaction.findUnique({
      where: { videoId_userId: { videoId: req.params.id, userId: req.userId! } },
    });
    if (existing) {
      await prisma.videoReaction.delete({ where: { id: existing.id } });
      res.json({ data: { liked: false } });
    } else {
      await prisma.videoReaction.create({ data: { videoId: req.params.id, userId: req.userId!, type: req.body.type || 'like' } });
      // Increment view count
      await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
      res.json({ data: { liked: true } });
    }
  } catch (e) { next(e); }
});

videosRouter.post('/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.videoComment.create({
      data: { videoId: req.params.id, authorId: req.userId!, content: req.body.content },
      include: { author: { select: { id: true, displayName: true } } },
    });
    res.json({ data: comment });
  } catch (e) { next(e); }
});

videosRouter.get('/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.videoComment.findMany({
      where: { videoId: req.params.id },
      include: { author: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: comments });
  } catch (e) { next(e); }
});

// Track view
videosRouter.post('/:id/view', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.video.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});
