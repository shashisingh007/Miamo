// ─── Miamo Messaging Service ─────────────────────────
// Handles: Chats, Messages, Beats (Streaks)
// All messages encrypted with AES-256-GCM at rest
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// ═══ AES-256-GCM ENCRYPTION ═════════════════════════
const ENC_KEY = crypto.scryptSync(process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key', 'miamo-e2e-salt-2026', 32);
const ENC_ALGO = 'aes-256-gcm';

function encryptMessage(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptMessage(data: string): string {
  if (!data.startsWith('enc:')) return data; // plain text (legacy/system messages)
  try {
    const [, ivHex, tagHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return '[encrypted message]'; }
}

export const prisma = new PrismaClient();
export const app = express();
const PORT = parseInt(process.env.PORT || '3204', 10);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3100', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'test') app.use(morgan('short'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 2000, standardHeaders: true, legacyHeaders: false }));

interface AuthRequest extends Request { userId?: string; }
function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string;
  if (userId && req.headers['x-internal-key'] === (process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key')) {
    req.userId = userId; return next();
  }
  return res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHORIZED' } });
}

// Health
app.get('/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', service: 'messaging', timestamp: new Date().toISOString(), db: 'connected' }); }
  catch { res.status(503).json({ status: 'error', service: 'messaging', db: 'disconnected' }); }
});
app.get('/ready', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ready: true, service: 'messaging' }); }
  catch { res.status(503).json({ ready: false, service: 'messaging' }); }
});

// ═══ GATEWAY SSE PUSH HELPER ═════════════════════════
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3200';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'miamo-internal-dev-key';

async function pushToUser(userId: string, event: string, data: any) {
  try {
    await fetch(`${GATEWAY_URL}/internal/push-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': INTERNAL_KEY },
      body: JSON.stringify({ userId, event, data }),
    });
  } catch {}
}

// ═══ CHATS & MESSAGES ════════════════════════════════
app.get('/api/v1/messages/chats', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: userId, archived1: false }, { user2Id: userId, archived2: false }] },
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result: any[] = [];
    for (const c of chats) {
      const rawOther = c.user1Id === userId ? c.user2 : c.user1;
      const { passwordHash, ...otherUser } = rawOther;
      const lastMsg = c.messages[0] || null;
      const lastContent = lastMsg ? decryptMessage(lastMsg.content) : null;
      const unreadCount = await prisma.message.count({ where: { chatId: c.id, senderId: { not: userId }, read: false, deletedForAll: false } });
      result.push({
        id: c.id,
        otherUser,
        lastMessage: lastMsg ? { ...lastMsg, content: lastContent } : null,
        lastMessagePreview: lastContent ? (lastContent.length > 50 ? lastContent.substring(0, 50) + '…' : lastContent) : null,
        lastMessageAt: lastMsg?.createdAt || c.updatedAt,
        pinned: c.user1Id === userId ? c.pinned1 : c.pinned2,
        muted: c.user1Id === userId ? c.muted1 : c.muted2,
        background: c.background,
        theme: c.theme,
        unreadCount,
      });
    }
    result.sort((a, b) => (a.pinned && !b.pinned ? -1 : !a.pinned && b.pinned ? 1 : 0));
    res.json({ data: result });
  } catch (e) { next(e); }
});

app.get('/api/v1/messages/chats/archived', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: userId, archived1: true }, { user2Id: userId, archived2: true }] },
      include: { user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
    const result = chats.map(c => {
      const o = c.user1Id === userId ? c.user2 : c.user1;
      const { passwordHash, ...otherUser } = o;
      const lastMsg = c.messages[0] || null;
      const lastContent = lastMsg ? decryptMessage(lastMsg.content) : null;
      return {
        id: c.id,
        otherUser,
        lastMessage: lastMsg,
        lastMessagePreview: lastContent ? (lastContent.length > 50 ? lastContent.substring(0, 50) + '…' : lastContent) : null,
        lastMessageAt: lastMsg?.createdAt || c.updatedAt,
        unreadCount: 0,
      };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

app.get('/api/v1/messages/chats/:chatId/messages', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { cursor } = req.query;
    const userId = req.userId!;
    const messages = await prisma.message.findMany({
      where: { chatId, deletedForAll: false, NOT: { deletedFor: { contains: userId } } },
      include: {
        sender: { select: { id: true, displayName: true, username: true } },
        replyTo: { select: { id: true, content: true, senderId: true, sender: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' }, take: 50,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });
    await prisma.message.updateMany({ where: { chatId, senderId: { not: userId }, read: false }, data: { read: true } });
    // Decrypt messages and add isOwn flag
    const decrypted = messages.reverse().map(m => ({
      ...m,
      content: m.deletedForAll ? m.content : decryptMessage(m.content),
      isOwn: m.senderId === userId,
      replyTo: m.replyTo ? { ...m.replyTo, content: decryptMessage(m.replyTo.content), senderName: (m.replyTo as any).sender?.displayName } : null,
    }));
    res.json({ data: decrypted });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/messages', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { content, type, replyToId } = req.body;
    const userId = req.userId!;
    // Encrypt the message content before storing
    const encryptedContent = encryptMessage(content);
    const message = await prisma.message.create({
      data: { chatId, senderId: userId, content: encryptedContent, type: type || 'text', replyToId },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
    });
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat) {
      const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      const senderUser = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true } });
      await prisma.notification.create({ data: { userId: otherId, type: 'message', title: `${senderUser?.displayName || 'Someone'} sent a message`, body: content.substring(0, 100) } });
      // Push real-time event to receiver
      const unreadCount = await prisma.notification.count({ where: { userId: otherId, read: false } });
      pushToUser(otherId, 'new-message', { chatId, senderId: userId, senderName: senderUser?.displayName, content: content.substring(0, 100), messageId: message.id });
      pushToUser(otherId, 'new-notification', { unreadCount, notification: { type: 'message', title: `${senderUser?.displayName || 'Someone'} sent a message` } });
      // Push chat-update to sender too (for multi-tab)
      pushToUser(userId, 'message-sent', { chatId, messageId: message.id });
    }
    // Return decrypted for the sender
    res.json({ data: { ...message, content, isOwn: true } });
  } catch (e) { next(e); }
});

app.put('/api/v1/messages/messages/:id', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const encContent = encryptMessage(req.body.content);
    const message = await prisma.message.update({ where: { id: req.params.id, senderId: req.userId }, data: { content: encContent, editedAt: new Date() } });
    res.json({ data: { ...message, content: req.body.content } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/messages/:id/delete-for-me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    const deletedFor = msg.deletedFor ? msg.deletedFor + ',' + req.userId : req.userId!;
    await prisma.message.update({ where: { id: req.params.id }, data: { deletedFor } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/messages/:id/delete-for-all', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.message.update({ where: { id: req.params.id, senderId: req.userId }, data: { deletedForAll: true, content: 'This message was deleted' } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/messages/:id/react', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    const reactions = msg.reactions ? JSON.parse(msg.reactions) : [];
    const idx = reactions.findIndex((r: any) => r.userId === req.userId);
    if (idx >= 0) reactions[idx].emoji = req.body.emoji;
    else reactions.push({ userId: req.userId, emoji: req.body.emoji });
    await prisma.message.update({ where: { id: req.params.id }, data: { reactions: JSON.stringify(reactions) } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/pin', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'pinned1' : 'pinned2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.pinned ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/mute', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'muted1' : 'muted2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.muted ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/archive', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.archived ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Unarchive
app.post('/api/v1/messages/chats/:chatId/unarchive', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Set chat theme/background
app.post('/api/v1/messages/chats/:chatId/theme', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { theme, background } = req.body;
    const data: any = {};
    if (theme) data.theme = theme;
    if (background) data.background = background;
    await prisma.chat.update({ where: { id: req.params.chatId }, data });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Clear chat (delete all messages for this user)
app.delete('/api/v1/messages/chats/:chatId/clear', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const messages = await prisma.message.findMany({ where: { chatId: req.params.chatId } });
    for (const msg of messages) {
      const deletedFor = msg.deletedFor ? msg.deletedFor + ',' + userId : userId;
      await prisma.message.update({ where: { id: msg.id }, data: { deletedFor } });
    }
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Search messages in a chat
app.get('/api/v1/messages/chats/:chatId/search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const userId = req.userId!;
    if (!q) return res.json({ data: [] });
    const messages = await prisma.message.findMany({
      where: {
        chatId: req.params.chatId,
        content: { contains: q as string, mode: 'insensitive' },
        deletedForAll: false,
        NOT: { deletedFor: { contains: userId } },
      },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ data: messages.map(m => ({ ...m, content: decryptMessage(m.content) })) });
  } catch (e) { next(e); }
});

// Delete for all — only sender, within 2 hours
app.post('/api/v1/messages/messages/:id/delete-for-all', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    if (msg.senderId !== req.userId) return res.status(403).json({ error: { message: 'Can only delete your own messages for everyone' } });
    const ageMs = Date.now() - msg.createdAt.getTime();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    if (ageMs > twoHoursMs) return res.status(400).json({ error: { message: 'Can only delete for everyone within 2 hours of sending' } });
    await prisma.message.update({ where: { id: req.params.id }, data: { deletedForAll: true, content: 'This message was deleted' } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ── AI Conversation Helpers ──
// Get smart reply suggestions based on context
app.post('/api/v1/messages/chats/:chatId/suggestions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
    const otherUser = await prisma.user.findUnique({ where: { id: otherId }, include: { profile: true, interests: true } });
    const recentMessages = await prisma.message.findMany({
      where: { chatId: req.params.chatId, deletedForAll: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const lastMsg = recentMessages[0]?.content || '';
    const otherInterests = otherUser?.interests?.map(i => i.name) || [];
    const otherCity = otherUser?.profile?.city || '';
    const otherProfession = otherUser?.profile?.profession || '';

    // Context-aware suggestions
    const suggestions: { text: string; type: string }[] = [];
    const { context } = req.body;

    if (!lastMsg || recentMessages.length < 2) {
      // Conversation starters
      suggestions.push(
        { text: `Hey ${otherUser?.displayName?.split(' ')[0] || 'there'}! How's your day going? 😊`, type: 'starter' },
        { text: `I noticed we both love ${otherInterests[0] || 'creative things'}! What got you into it?`, type: 'interest' },
      );
      if (otherCity) suggestions.push({ text: `How's life in ${otherCity}? I've always been curious about it!`, type: 'location' });
      if (otherProfession) suggestions.push({ text: `${otherProfession} sounds fascinating! What's the best part?`, type: 'career' });
      suggestions.push(
        { text: `If you could travel anywhere tomorrow, where would you go? ✈️`, type: 'fun' },
        { text: `What's something you're passionate about that most people don't know?`, type: 'deep' },
      );
    } else if (context === 'flirty') {
      suggestions.push(
        { text: `You know what I like about you? Your energy is contagious 💜`, type: 'flirty' },
        { text: `I have a feeling we'd have an amazing time together 😉`, type: 'flirty' },
        { text: `Your profile made me smile. Tell me more about yourself!`, type: 'flirty' },
      );
    } else if (context === 'deep') {
      suggestions.push(
        { text: `What's something you've learned about yourself recently?`, type: 'deep' },
        { text: `If you could change one thing about the world, what would it be?`, type: 'deep' },
        { text: `What does your ideal life look like 5 years from now?`, type: 'deep' },
      );
    } else if (context === 'fun') {
      suggestions.push(
        { text: `Hot take: pineapple on pizza — yes or no? 🍕`, type: 'fun' },
        { text: `If you won the lottery tomorrow, what's the first thing you'd do?`, type: 'fun' },
        { text: `What's the most spontaneous thing you've ever done?`, type: 'fun' },
      );
    } else {
      // Regular follow-up based on last message
      suggestions.push(
        { text: `That's really interesting! Tell me more 😊`, type: 'followup' },
        { text: `I totally relate to that! For me it's similar because...`, type: 'relate' },
        { text: `What else are you up to today?`, type: 'casual' },
      );
      if (otherInterests.length > 1) suggestions.push({ text: `By the way, I saw you're into ${otherInterests[1]}! Me too!`, type: 'interest' });
    }

    res.json({ data: suggestions.slice(0, 6) });
  } catch (e) { next(e); }
});

// ── Harsh Words Detection ──
const HARSH_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'cunt', 'nigger', 'faggot', 'retard', 'kill yourself', 'die', 'kys', 'stfu', 'wtf', 'rape', 'molest', 'abuse', 'threat', 'bomb', 'terror'];
app.post('/api/v1/messages/check-content', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content) return res.json({ data: { safe: true, warnings: [] } });
  const lower = content.toLowerCase();
  const found = HARSH_WORDS.filter(w => lower.includes(w));
  res.json({
    data: {
      safe: found.length === 0,
      warnings: found,
      message: found.length > 0
        ? 'This message contains words that may violate community guidelines. Sending it could result in your profile being flagged or blocked.'
        : null,
    },
  });
});

// ── Chat Background Presets ──
app.get('/api/v1/messages/backgrounds', authMiddleware, async (_req: AuthRequest, res: Response) => {
  const backgrounds = [
    { id: 'default', name: 'Default Dark', type: 'solid', value: '#0d0d12' },
    { id: 'midnight', name: 'Midnight Blue', type: 'gradient', value: 'linear-gradient(180deg, #0a1628 0%, #1a0a28 100%)' },
    { id: 'aurora', name: 'Aurora', type: 'gradient', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
    { id: 'sunset', name: 'Sunset Glow', type: 'gradient', value: 'linear-gradient(180deg, #1a0a28 0%, #2d1b3d 50%, #1a0a28 100%)' },
    { id: 'ocean', name: 'Deep Ocean', type: 'gradient', value: 'linear-gradient(180deg, #000428 0%, #004e92 100%)' },
    { id: 'forest', name: 'Forest Night', type: 'gradient', value: 'linear-gradient(180deg, #0a1a0a 0%, #1a2a1a 100%)' },
    { id: 'lavender', name: 'Lavender Dream', type: 'gradient', value: 'linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 100%)' },
    { id: 'rose', name: 'Rose Gold', type: 'gradient', value: 'linear-gradient(180deg, #2a1a1a 0%, #3d2b2b 100%)' },
    { id: 'neon', name: 'Neon City', type: 'gradient', value: 'linear-gradient(180deg, #0d0d1a 0%, #1a0d2a 50%, #0d1a2a 100%)' },
    { id: 'cosmos', name: 'Cosmos', type: 'gradient', value: 'linear-gradient(135deg, #0c0c1d 0%, #1e1040 50%, #0c0c1d 100%)' },
    { id: 'cherry', name: 'Cherry Blossom', type: 'gradient', value: 'linear-gradient(180deg, #1a0a14 0%, #2d1b24 100%)' },
    { id: 'arctic', name: 'Arctic Ice', type: 'gradient', value: 'linear-gradient(180deg, #0a141a 0%, #1a2a3a 100%)' },
    { id: 'volcano', name: 'Volcano', type: 'gradient', value: 'linear-gradient(180deg, #1a0a0a 0%, #3d1b0a 100%)' },
    { id: 'emerald', name: 'Emerald', type: 'gradient', value: 'linear-gradient(180deg, #0a1a14 0%, #1b3d2b 100%)' },
    { id: 'twilight', name: 'Twilight', type: 'gradient', value: 'linear-gradient(180deg, #141028 0%, #281a3d 50%, #1a1028 100%)' },
    { id: 'golden', name: 'Golden Hour', type: 'gradient', value: 'linear-gradient(180deg, #1a1408 0%, #2d2410 100%)' },
    { id: 'sapphire', name: 'Sapphire', type: 'gradient', value: 'linear-gradient(180deg, #0a0a2d 0%, #14143d 100%)' },
    { id: 'pearl', name: 'Pearl', type: 'gradient', value: 'linear-gradient(180deg, #1a1a1e 0%, #2a2a30 100%)' },
    { id: 'cyberpunk', name: 'Cyberpunk', type: 'gradient', value: 'linear-gradient(135deg, #0d0d1a 0%, #2a0a2a 50%, #0a2a2a 100%)' },
    { id: 'sports-stadium', name: 'Stadium Lights', type: 'gradient', value: 'linear-gradient(180deg, #0a140a 0%, #1a2a0a 50%, #0a140a 100%)' },
    { id: 'beach', name: 'Beach Vibes', type: 'gradient', value: 'linear-gradient(180deg, #0a1a2a 0%, #1a2a3a 50%, #0a1420 100%)' },
    { id: 'mountain', name: 'Mountain Peak', type: 'gradient', value: 'linear-gradient(180deg, #141418 0%, #1e2028 50%, #10141c 100%)' },
    { id: 'starry', name: 'Starry Night', type: 'gradient', value: 'radial-gradient(ellipse at top, #0a1028 0%, #060610 100%)' },
    { id: 'tokyo', name: 'Tokyo Nights', type: 'gradient', value: 'linear-gradient(180deg, #0d0a1e 0%, #1e0a28 50%, #0a0d1e 100%)' },
  ];
  res.json({ data: backgrounds });
});

app.get('/api/v1/beats', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { state } = req.query;
    const where: any = { OR: [{ user1Id: userId }, { user2Id: userId }] };
    if (state) where.state = state;
    const beats = await prisma.beat.findMany({
      where,
      include: { user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } }, events: { take: 50, orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    const result = beats.map(b => {
      const isUser1 = b.user1Id === userId;
      const o = isUser1 ? b.user2 : b.user1;
      const { passwordHash, ...other } = o;
      const myLast = isUser1 ? b.lastUser1 : b.lastUser2;
      const theirLast = isUser1 ? b.lastUser2 : b.lastUser1;
      const now = Date.now();
      const iSentToday = myLast ? (now - new Date(myLast).getTime()) < 86400000 : false;
      const theyCompletedToday = theirLast ? (now - new Date(theirLast).getTime()) < 86400000 : false;
      return {
        id: b.id, user: other, count: b.count, state: b.state, events: b.events,
        iSentToday, theyCompletedToday, todayCompleted: iSentToday && theyCompletedToday,
        createdAt: b.createdAt, updatedAt: b.updatedAt,
      };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/start', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { matchedUserId } = req.body;
    const userId = req.userId!;
    const match = await prisma.match.findFirst({ where: { OR: [{ user1Id: userId, user2Id: matchedUserId }, { user1Id: matchedUserId, user2Id: userId }], active: true } });
    if (!match) return res.status(400).json({ error: { message: 'Must be matched first' } });
    // Check for existing beat between these users
    const existing = await prisma.beat.findFirst({ where: { OR: [{ user1Id: userId, user2Id: matchedUserId }, { user1Id: matchedUserId, user2Id: userId }], state: { not: 'archived' } } });
    if (existing) return res.json({ data: existing });
    const beat = await prisma.beat.create({ data: { user1Id: userId, user2Id: matchedUserId, count: 1, state: 'active', lastUser1: new Date() } });
    await prisma.beatEvent.create({ data: { beatId: beat.id, userId, type: 'text', content: 'Beat started! ⚡' } });
    res.json({ data: beat });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/:id/complete', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat) return res.status(404).json({ error: { message: 'Beat not found' } });
    if (beat.user1Id !== userId && beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Not your beat' } });
    if (beat.state === 'lost' || beat.state === 'archived') return res.status(400).json({ error: { message: 'Beat is not active' } });
    const isUser1 = beat.user1Id === userId;
    const lastField = isUser1 ? 'lastUser1' : 'lastUser2';
    const otherLastField = isUser1 ? 'lastUser2' : 'lastUser1';
    const myLast = beat[lastField as keyof typeof beat] as Date | null;
    const otherLast = beat[otherLastField as keyof typeof beat] as Date | null;
    const now = new Date();
    const DAY = 86400000;
    // Did I already send today? (within 24h)
    const iAlreadySentToday = myLast && (now.getTime() - myLast.getTime()) < DAY;
    if (iAlreadySentToday) return res.status(400).json({ error: { message: 'You already sent a beat today! Come back tomorrow.' }, data: { iSentToday: true } });
    // Did the other user send today?
    const otherCompletedToday = otherLast && (now.getTime() - otherLast.getTime()) < DAY;
    // Count increases ONLY when: both sent today AND this is my first send of the day
    const shouldIncrement = otherCompletedToday && !iAlreadySentToday;
    const newCount = shouldIncrement ? beat.count + 1 : beat.count;
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { [lastField]: now, count: newCount, state: 'active' } });
    await prisma.beatEvent.create({ data: { beatId: beat.id, userId, type: req.body.type || 'snap', content: req.body.content || 'Daily beat! ⚡' } });
    // Push real-time beat update to both users
    const otherId = isUser1 ? beat.user2Id : beat.user1Id;
    pushToUser(otherId, 'beat-update', { beatId: beat.id, count: newCount, fromUserId: userId });
    pushToUser(userId, 'beat-update', { beatId: beat.id, count: newCount, fromUserId: userId });
    res.json({ data: { ...updated, countIncremented: shouldIncrement, iSentToday: true, theyCompletedToday: !!otherCompletedToday, todayCompleted: !!otherCompletedToday } });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/:id/miss', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat || (beat.user1Id !== req.userId && beat.user2Id !== req.userId)) return res.status(403).json({ error: { message: 'Forbidden' } });
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { state: 'weak' } }); res.json({ data: updated });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/:id/expire', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat || (beat.user1Id !== req.userId && beat.user2Id !== req.userId)) return res.status(403).json({ error: { message: 'Forbidden' } });
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { state: 'lost', count: 0 } }); res.json({ data: updated });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/:id/restore', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat || (beat.user1Id !== req.userId && beat.user2Id !== req.userId)) return res.status(403).json({ error: { message: 'Forbidden' } });
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { state: 'active', count: 1, lastUser1: new Date(), lastUser2: new Date() } }); res.json({ data: updated });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/:id/archive', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat || (beat.user1Id !== req.userId && beat.user2Id !== req.userId)) return res.status(403).json({ error: { message: 'Forbidden' } });
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { state: 'archived' } }); res.json({ data: updated });
  } catch (e) { next(e); }
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ error: { message: err.message, code: err.code || 'INTERNAL_ERROR', statusCode } });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => { console.log(`\n⚡ Miamo Messaging Service on port ${PORT}\n`); });
}
