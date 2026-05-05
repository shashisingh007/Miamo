// ─── Feed Routes ─────────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const feedRouter = Router();

// Get feed
feedRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { cursor, type, authorId } = req.query;
    const where: any = { visibility: { in: ['everyone'] } };
    if (type) where.type = type;
    if (authorId) where.authorId = authorId;

    const posts = await prisma.feedPost.findMany({
      where,
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        reactions: true,
        comments: { take: 3, orderBy: { createdAt: 'desc' }, include: { author: { select: { id: true, displayName: true } } } },
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const userId = req.userId!;
    const result = posts.map(p => {
      const { passwordHash, ...author } = p.author;
      return {
        ...p, author,
        liked: p.reactions.some(r => r.userId === userId),
        likeCount: p._count.reactions,
        commentCount: p._count.comments,
      };
    });

    res.json({ data: result, cursor: posts[posts.length - 1]?.id });
  } catch (e) { next(e); }
});

// Create post
feedRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Update post
feedRouter.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const post = await prisma.feedPost.update({
      where: { id: req.params.id, authorId: req.userId },
      data: { content: req.body.content, type: req.body.type, visibility: req.body.visibility },
    });
    res.json({ data: post });
  } catch (e) { next(e); }
});

// Delete post
feedRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.feedPost.delete({ where: { id: req.params.id, authorId: req.userId } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Like/react to post
feedRouter.post('/:id/react', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.feedReaction.findUnique({
      where: { postId_userId: { postId: req.params.id, userId: req.userId! } },
    });
    if (existing) {
      await prisma.feedReaction.delete({ where: { id: existing.id } });
      res.json({ data: { liked: false } });
    } else {
      await prisma.feedReaction.create({
        data: { postId: req.params.id, userId: req.userId!, type: req.body.type || 'like' },
      });
      res.json({ data: { liked: true } });
    }
  } catch (e) { next(e); }
});

// Comment on post
feedRouter.post('/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comment = await prisma.feedComment.create({
      data: { postId: req.params.id, authorId: req.userId!, content: req.body.content },
      include: { author: { select: { id: true, displayName: true, username: true } } },
    });
    res.json({ data: comment });
  } catch (e) { next(e); }
});

// Get comments
feedRouter.get('/:id/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const comments = await prisma.feedComment.findMany({
      where: { postId: req.params.id },
      include: { author: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ data: comments });
  } catch (e) { next(e); }
});
