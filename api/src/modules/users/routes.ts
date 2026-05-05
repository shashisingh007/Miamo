// ─── Users Routes ────────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const usersRouter = Router();

usersRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      where: { active: true, deactivated: false },
      include: { profile: true, photos: { orderBy: { position: 'asc' }, take: 1 } },
      take: 50,
    });
    res.json({ data: users.map(u => { const { passwordHash, ...rest } = u; return rest; }) });
  } catch (e) { next(e); }
});

usersRouter.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: true, photos: { orderBy: { position: 'asc' } }, prompts: { orderBy: { position: 'asc' } }, interests: true },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const { passwordHash, ...rest } = user;
    res.json({ data: rest });
  } catch (e) { next(e); }
});
