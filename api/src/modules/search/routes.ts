// ─── Search Routes ───────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const searchRouter = Router();

searchRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q, type } = req.query;
    const userId = req.userId!;
    const query = (q as string || '').trim();
    if (!query) return res.json({ data: [] });

    // Get blocked IDs
    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    });
    const blockedIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    blockedIds.push(userId);

    const searchType = type as string || 'all';
    let results: any[] = [];

    if (searchType === 'all' || searchType === 'user') {
      const users = await prisma.user.findMany({
        where: {
          id: { notIn: blockedIds },
          active: true,
          privacySettings: { disableSearch: false },
          OR: [
            { displayName: { contains: query, mode: 'insensitive' } },
            { username: { contains: query, mode: 'insensitive' } },
            { miamoId: { contains: query, mode: 'insensitive' } },
            { profile: { city: { contains: query, mode: 'insensitive' } } },
          ],
        },
        include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } }, interests: true },
        take: 20,
      });

      results = users.map(u => {
        const { passwordHash, ...rest } = u;
        return { type: 'user', ...rest };
      });
    }

    // Log search
    await prisma.searchLog.create({
      data: { userId, query, type: searchType, results: results.length },
    });

    res.json({ data: results });
  } catch (e) { next(e); }
});
