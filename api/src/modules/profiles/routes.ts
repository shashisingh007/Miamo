// ─── Profiles Routes ─────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const profilesRouter = Router();

// Get my profile
profilesRouter.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: req.userId } });
    const photos = await prisma.profilePhoto.findMany({ where: { userId: req.userId }, orderBy: { position: 'asc' } });
    const prompts = await prisma.profilePrompt.findMany({ where: { userId: req.userId }, orderBy: { position: 'asc' } });
    const interests = await prisma.profileInterest.findMany({ where: { userId: req.userId } });
    res.json({ data: { profile, photos, prompts, interests } });
  } catch (e) { next(e); }
});

// Update profile
profilesRouter.put('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { age, gender, city, profession, bio, datingIntent, seriousMode, avatarGradient } = req.body;
    const data: any = {};
    if (age !== undefined) data.age = age;
    if (gender !== undefined) data.gender = gender;
    if (city !== undefined) data.city = city;
    if (profession !== undefined) data.profession = profession;
    if (bio !== undefined) data.bio = bio;
    if (datingIntent !== undefined) data.datingIntent = datingIntent;
    if (seriousMode !== undefined) data.seriousMode = seriousMode;
    if (avatarGradient !== undefined) data.avatarGradient = avatarGradient;

    const profile = await prisma.profile.update({ where: { userId: req.userId }, data });

    // Recalculate profile score
    const photos = await prisma.profilePhoto.count({ where: { userId: req.userId } });
    const prompts = await prisma.profilePrompt.count({ where: { userId: req.userId } });
    const interests = await prisma.profileInterest.count({ where: { userId: req.userId } });
    let score = 20;
    if (profile.bio.length > 10) score += 15;
    score += Math.min(photos * 10, 20);
    score += Math.min(prompts * 10, 15);
    score += Math.min(interests * 3, 15);
    if (profile.profession !== 'Not set') score += 5;
    if (profile.city !== 'Unknown') score += 5;
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user?.verified) score += 5;
    score = Math.min(score, 100);

    const updated = await prisma.profile.update({ where: { userId: req.userId }, data: { profileScore: score } });
    res.json({ data: updated });
  } catch (e) { next(e); }
});

// Update prompts
profilesRouter.put('/me/prompts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompts } = req.body; // [{question, answer}]
    await prisma.profilePrompt.deleteMany({ where: { userId: req.userId } });
    for (let i = 0; i < prompts.length; i++) {
      await prisma.profilePrompt.create({
        data: { userId: req.userId!, question: prompts[i].question, answer: prompts[i].answer, position: i },
      });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Update interests
profilesRouter.put('/me/interests', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { interests } = req.body; // string[]
    await prisma.profileInterest.deleteMany({ where: { userId: req.userId } });
    for (const name of interests) {
      await prisma.profileInterest.create({ data: { userId: req.userId!, name } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});
