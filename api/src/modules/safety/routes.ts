// ─── Safety Routes ───────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const safetyRouter = Router();

// Report user
safetyRouter.post('/report', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reportedId, reason, details, targetType, targetId } = req.body;
    const report = await prisma.report.create({
      data: {
        reporterId: req.userId!, reportedId,
        reason, details: details || '',
        targetType: targetType || 'user', targetId,
        status: 'pending',
      },
    });
    res.json({ data: report });
  } catch (e) { next(e); }
});

// Block user
safetyRouter.post('/block', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { blockedId } = req.body;
    const userId = req.userId!;

    const block = await prisma.block.create({
      data: { blockerId: userId, blockedId },
    });

    // Remove pending match requests
    await prisma.matchRequest.deleteMany({
      where: { OR: [{ fromUserId: userId, toUserId: blockedId }, { fromUserId: blockedId, toUserId: userId }] },
    });

    // Deactivate matches
    await prisma.match.updateMany({
      where: { OR: [{ user1Id: userId, user2Id: blockedId }, { user1Id: blockedId, user2Id: userId }] },
      data: { active: false },
    });

    res.json({ data: block });
  } catch (e) { next(e); }
});

// Unblock user
safetyRouter.post('/unblock', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.block.deleteMany({
      where: { blockerId: req.userId!, blockedId: req.body.blockedId },
    });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Get my reports
safetyRouter.get('/reports', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await prisma.report.findMany({
      where: { reporterId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: reports });
  } catch (e) { next(e); }
});

// Get safety tips
safetyRouter.get('/tips', async (_req: AuthRequest, res: Response) => {
  res.json({
    data: [
      { title: 'Verify your profile', description: 'Add a verified badge to build trust with your matches.' },
      { title: 'Meet in public places', description: 'For first dates, always choose a public location.' },
      { title: 'Tell someone your plans', description: 'Let a friend know where you\'re going and who you\'re meeting.' },
      { title: 'Trust your instincts', description: 'If something feels off, don\'t hesitate to leave or report.' },
      { title: 'Don\'t share personal info early', description: 'Keep your address and financial details private until you build trust.' },
      { title: 'Use Miamo video call first', description: 'Video-chat before meeting in person to verify identity.' },
    ],
  });
});
