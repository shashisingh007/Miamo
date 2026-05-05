// ─── Settings Routes ─────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const settingsRouter = Router();

// Get settings
settingsRouter.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { userId: req.userId } });
    const privacy = await prisma.privacySettings.findUnique({ where: { userId: req.userId } });
    res.json({ data: { settings, privacy } });
  } catch (e) { next(e); }
});

// Update settings
settingsRouter.put('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.settings.update({
      where: { userId: req.userId },
      data: req.body,
    });
    res.json({ data: settings });
  } catch (e) { next(e); }
});

// Update privacy
settingsRouter.put('/privacy', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const privacy = await prisma.privacySettings.update({
      where: { userId: req.userId },
      data: req.body,
    });
    res.json({ data: privacy });
  } catch (e) { next(e); }
});

// Deactivate account (demo)
settingsRouter.post('/deactivate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { deactivated: true } });
    await prisma.profile.update({ where: { userId: req.userId }, data: { online: false } });
    res.json({ data: { success: true, message: 'Account deactivated' } });
  } catch (e) { next(e); }
});

// Reactivate
settingsRouter.post('/reactivate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({ where: { id: req.userId }, data: { deactivated: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Export data (demo)
settingsRouter.get('/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { profile: true, photos: true, prompts: true, interests: true, settings: true, privacySettings: true },
    });
    if (!user) return res.status(404).json({ error: { message: 'User not found' } });
    const { passwordHash, ...data } = user;
    res.json({ data });
  } catch (e) { next(e); }
});

// Block list
settingsRouter.get('/blocks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: req.userId! },
      include: { blocked: { select: { id: true, displayName: true, username: true } } },
    });
    res.json({ data: blocks });
  } catch (e) { next(e); }
});
