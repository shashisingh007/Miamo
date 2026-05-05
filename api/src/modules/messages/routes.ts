// ─── Messages Routes ─────────────────────────────────
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../server';
import { AuthRequest } from '../../middleware/auth';

export const messagesRouter = Router();

// Get my chats
messagesRouter.get('/chats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { user1Id: userId, archived1: false },
          { user2Id: userId, archived2: false },
        ],
      },
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = chats.map(c => {
      const otherUser = c.user1Id === userId ? c.user2 : c.user1;
      const { passwordHash, ...other } = otherUser;
      const pinned = c.user1Id === userId ? c.pinned1 : c.pinned2;
      const muted = c.user1Id === userId ? c.muted1 : c.muted2;
      return {
        id: c.id,
        user: other,
        lastMessage: c.messages[0] || null,
        pinned, muted, background: c.background, theme: c.theme,
        unread: 0, // will count below
      };
    });

    // Count unread for each chat
    for (const chat of result) {
      const count = await prisma.message.count({
        where: { chatId: chat.id, senderId: { not: userId }, read: false, deletedForAll: false },
      });
      chat.unread = count;
    }

    // Sort: pinned first, then by last message
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });

    res.json({ data: result });
  } catch (e) { next(e); }
});

// Get archived chats
messagesRouter.get('/chats/archived', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { user1Id: userId, archived1: true },
          { user2Id: userId, archived2: true },
        ],
      },
      include: {
        user1: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        user2: { include: { profile: true, photos: { take: 1, orderBy: { position: 'asc' } } } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    const result = chats.map(c => {
      const otherUser = c.user1Id === userId ? c.user2 : c.user1;
      const { passwordHash, ...other } = otherUser;
      return { id: c.id, user: other, lastMessage: c.messages[0] || null };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Get messages in a chat
messagesRouter.get('/chats/:chatId/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { cursor } = req.query;
    const userId = req.userId!;

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        deletedForAll: false,
        NOT: { deletedFor: { contains: userId } },
      },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { chatId, senderId: { not: userId }, read: false },
      data: { read: true },
    });

    res.json({ data: messages.reverse() });
  } catch (e) { next(e); }
});

// Send message
messagesRouter.post('/chats/:chatId/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { content, type, replyToId } = req.body;
    const userId = req.userId!;

    const message = await prisma.message.create({
      data: { chatId, senderId: userId, content, type: type || 'text', replyToId },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
    });

    // Update chat timestamp
    await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

    // Notify other user
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (chat) {
      const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      await prisma.notification.create({
        data: { userId: otherId, type: 'message', title: 'New message', body: content.substring(0, 100) },
      });
    }

    res.json({ data: message });
  } catch (e) { next(e); }
});

// Edit message
messagesRouter.put('/messages/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id, senderId: req.userId },
      data: { content: req.body.content, editedAt: new Date() },
    });
    res.json({ data: message });
  } catch (e) { next(e); }
});

// Delete message for me
messagesRouter.post('/messages/:id/delete-for-me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    const deletedFor = msg.deletedFor ? msg.deletedFor + ',' + req.userId : req.userId!;
    await prisma.message.update({ where: { id: req.params.id }, data: { deletedFor } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Delete message for everyone
messagesRouter.post('/messages/:id/delete-for-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.message.update({
      where: { id: req.params.id, senderId: req.userId },
      data: { deletedForAll: true, content: 'This message was deleted' },
    });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// React to message
messagesRouter.post('/messages/:id/react', async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Chat actions
messagesRouter.post('/chats/:chatId/pin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'pinned1' : 'pinned2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.pinned ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.post('/chats/:chatId/mute', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'muted1' : 'muted2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.muted ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.post('/chats/:chatId/archive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.archived ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.post('/chats/:chatId/unarchive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.post('/chats/:chatId/theme', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { theme: req.body.theme || 'default' } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.post('/chats/:chatId/background', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { background: req.body.background || 'default' } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

messagesRouter.delete('/chats/:chatId/clear', async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// Search messages
messagesRouter.get('/chats/:chatId/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const messages = await prisma.message.findMany({
      where: { chatId: req.params.chatId, content: { contains: q as string, mode: 'insensitive' }, deletedForAll: false },
      include: { sender: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json({ data: messages });
  } catch (e) { next(e); }
});
