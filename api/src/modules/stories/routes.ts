// ─── Stories Routes ──────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const storiesRouter = Router();

// Get stories feed (non-expired)
storiesRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() }, visibility: 'everyone' },
      include: {
        author: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        views: { where: { viewerId: userId } },
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by author
    const grouped: Record<string, any> = {};
    for (const s of stories) {
      const { passwordHash, ...author } = s.author;
      if (!grouped[s.authorId]) {
        grouped[s.authorId] = { user: author, stories: [], viewed: true };
      }
      const viewed = s.views.length > 0;
      grouped[s.authorId].stories.push({ ...s, author: undefined, viewed, viewCount: s._count.views });
      if (!viewed) grouped[s.authorId].viewed = false;
    }

    res.json({ data: Object.values(grouped) });
  } catch (e) { next(e); }
});

// Create story
storiesRouter.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, content, mediaUrl, visibility, expiresInHours } = req.body;
    const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 3600000);
    const story = await prisma.story.create({
      data: { authorId: req.userId!, type: type || 'text', content: content || '', mediaUrl, visibility: visibility || 'everyone', expiresAt },
    });
    res.json({ data: story });
  } catch (e) { next(e); }
});

// View story
storiesRouter.post('/:id/view', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: req.params.id, viewerId: req.userId! } },
      create: { storyId: req.params.id, viewerId: req.userId! },
      update: {},
    });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// React to story
storiesRouter.post('/:id/react', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: req.params.id, viewerId: req.userId! } },
      create: { storyId: req.params.id, viewerId: req.userId!, reaction: req.body.reaction },
      update: { reaction: req.body.reaction },
    });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Get story viewers
storiesRouter.get('/:id/viewers', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const views = await prisma.storyView.findMany({
      where: { storyId: req.params.id },
      include: { viewer: { select: { id: true, displayName: true, username: true } } },
    });
    res.json({ data: views });
  } catch (e) { next(e); }
});

// Delete story
storiesRouter.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.story.delete({ where: { id: req.params.id, authorId: req.userId } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});
