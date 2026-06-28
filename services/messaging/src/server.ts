// ─── Miamo Messaging Service ─────────────────────────
// Handles: Chats, Messages, Beats (Streaks)
// All messages encrypted with AES-256-GCM at rest
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { LRUCache, TTL } from '../../shared/cache';
import { logger } from '../../shared/src/logger';
import { errorHandler } from '../../shared/src/errorHandler';
import { validate } from '../../shared/src/validate';
import {
  sendMessageBodySchema,
  messageReactBodySchema,
  chatThemeBodySchema,
  chatPinBodySchema,
  chatMuteBodySchema,
  chatArchiveBodySchema,
  messageEditBodySchema,
  beatStartBodySchema,
  beatCompleteBodySchema,
} from '../../shared/src/schemas';
import { idempotency } from '../../shared/src/idempotency';
import { sanitize } from '../../shared/src/sanitize';
import { auditLog, trackActivity } from '../../shared/src/audit';
import { emitServerEvent } from '../../shared/src/track/serverEmit';
import { hashUid } from '../../shared/src/track/hash';
import { env } from '../../shared/src/env';
import { createPrisma, applyBaseMiddleware, installHealthRoutes, createInternalAuthMiddleware, createPushToUser, installSentry } from '../../shared/src/service';
import { cursorOpt } from '../../shared/src/coerce';
import { PrismaSignalReader } from '../../shared/src/algo/signals';
import { suggestMessages } from '../../shared/src/algo/messageSuggest';
import { suggestMoves } from '../../shared/src/algo/moves';
import { v4RankEnabled } from '../../shared/src/algo/flags';
import { loadPersonalizationCtx, applyPersonalization } from '../../shared/personalize';
import { depositForNewChat, replyBonus, REPLY_WINDOW_MS } from '../../shared/src/algo/v8/antiGhost';
import { isUserPremium } from '../../shared/src/premium';

// ─── v3.6.0 — Anti-ghost flag ───
function isAntiGhostEnabled(): boolean { return process.env.FEATURE_ANTI_GHOST_ENABLED === '1'; }

// ─── Chat Suggestion Cache ──────────────────────────
const suggestionCache = new LRUCache(200);

// ═══ AES-256-GCM ENCRYPTION ═════════════════════════
// Derive a 32-byte key from the encryption secret using scrypt (computationally
// expensive, resistant to brute-force). Salt provides per-deployment uniqueness
// while remaining deterministic across restarts so existing ciphertexts decrypt.
const ENC_SALT = env.encryptionSalt;
const ENC_KEY = crypto.scryptSync(env.encryptionKey, ENC_SALT, 32);
const ENC_ALGO = 'aes-256-gcm';

// Encrypt plaintext to format: "enc:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
// Each message gets a unique 16-byte random IV to prevent ciphertext pattern analysis.
// The authTag (GCM authentication tag) ensures tamper detection on decryption.
function encryptMessage(text: string): string {
  const iv = crypto.randomBytes(16); // Unique per message — CRITICAL for GCM security
  const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex'); // 16-byte auth tag for tamper detection
  return `enc:${iv.toString('hex')}:${tag}:${encrypted}`; // Stored format in DB
}

// Decrypt a message. Falls back to returning raw text for legacy/system messages
// (those not starting with "enc:"). Returns placeholder if decryption fails.
function decryptMessage(data: string): string {
  if (!data.startsWith('enc:')) return data; // Plain text — legacy or system-generated
  try {
    const [, ivHex, tagHex, encrypted] = data.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
    decipher.setAuthTag(tag); // Will throw if tag doesn't match (message tampered)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch { return '[encrypted message]'; } // Graceful degradation on key mismatch
}

// Build a human-readable preview from a message body, hiding internal markers
// (e.g. story-reply payloads encoded as [[STORY_REPLY:{json}]]\n<text>).
function previewFromContent(content: string | null): string | null {
  if (!content) return content;
  if (content.startsWith('[[STORY_REPLY:')) {
    const end = content.indexOf(']]');
    if (end > 0) {
      const body = content.slice(end + 2).replace(/^\n/, '').trim();
      return body ? `Replied to story: ${body}` : 'Replied to story';
    }
  }
  const legacy = content.match(/^Replying to story:\s*"[^"]*"\s*\n+([\s\S]*)$/);
  if (legacy) {
    const body = (legacy[1] || '').trim();
    return body ? `Replied to story: ${body}` : 'Replied to story';
  }
  return content;
}

const prisma = createPrisma(10);
export const app = express();
const PORT = parseInt(process.env.PORT || '3204', 10);

applyBaseMiddleware(app, { jsonLimit: '10mb', serviceName: 'messaging' });
// Sentry request handler — mounts after base middleware so requestId is in
// scope but before any route so every request lifecycle is captured. No-op
// when SENTRY_DSN is unset.
const sentry = installSentry({ serviceName: 'messaging' });
app.use(sentry.requestHandler);
interface AuthRequest extends Request { userId?: string }
const authMiddleware = createInternalAuthMiddleware();
installHealthRoutes(app, 'messaging', prisma);
const pushToUser = createPushToUser();

// ═══ CHAT MEMBERSHIP VERIFICATION ═══════════════════
// Security: Ensures the requesting user is a member of the chat before any operation
async function verifyChatMembership(chatId: string, userId: string): Promise<{ chat: any; isMember: boolean }> {
  const chat = await prisma.chat.findUnique({ where: { id: chatId } });
  if (!chat) return { chat: null, isMember: false };
  const isMember = chat.user1Id === userId || chat.user2Id === userId;
  return { chat, isMember };
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
    // Batch unread counts to avoid N+1 queries
    const chatIds = chats.map(c => c.id);
    const unreadCounts = await prisma.message.groupBy({
      by: ['chatId'],
      where: { chatId: { in: chatIds }, senderId: { not: userId }, read: false, deletedForAll: false },
      _count: { id: true },
    });
    const unreadMap = new Map(unreadCounts.map(u => [u.chatId, u._count.id]));

    for (const c of chats) {
      const rawOther = c.user1Id === userId ? c.user2 : c.user1;
      const { passwordHash, ...otherUser } = rawOther;
      const lastMsg = c.messages[0] || null;
      const lastContent = lastMsg ? decryptMessage(lastMsg.content) : null;
      const previewContent = previewFromContent(lastContent);
      const unreadCount = unreadMap.get(c.id) || 0;
      result.push({
        id: c.id,
        otherUser,
        lastMessage: lastMsg ? { ...lastMsg, content: lastContent } : null,
        lastMessagePreview: previewContent ? (previewContent.length > 50 ? previewContent.substring(0, 50) + '…' : previewContent) : null,
        lastMessageAt: lastMsg?.createdAt || c.updatedAt,
        pinned: c.user1Id === userId ? c.pinned1 : c.pinned2,
        muted: c.user1Id === userId ? c.muted1 : c.muted2,
        background: c.background,
        theme: c.theme,
        unreadCount,
      });
    }
    result.sort((a, b) => (a.pinned && !b.pinned ? -1 : !a.pinned && b.pinned ? 1 : 0));

    // v6.8 personalization overlay on chats list. Among non-pinned chats,
    // re-rank by recency × intent-blend − negative penalty (chat partner
    // sharing traits with previously-blocked users sinks).
    let pMeta: any = null;
    try {
      const ctx = await loadPersonalizationCtx(prisma, userId, { surface: 'chats', prevWindowMin: 1440 });
      const items = result.map((c: any) => {
        const u = c.otherUser;
        const lastMs = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : 0;
        const recencyScore = lastMs ? Math.max(0, 100 - (Date.now() - lastMs) / 86400_000) : 0;
        const unreadBoost = (c.unreadCount || 0) * 3;
        return {
          id: c.id,
          baseScore: recencyScore + unreadBoost,
          city: u.profile?.city,
          ageBucket: u.profile?.age ? (u.profile.age < 26 ? '22-25' : u.profile.age < 31 ? '26-30' : '31+') : undefined,
          traits: { city: u.profile?.city, datingIntent: u.profile?.datingIntent, smoking: u.profile?.smoking, drinking: u.profile?.drinking, religion: u.profile?.religion },
          _chat: c,
        };
      });
      const { ranked, diversifier } = applyPersonalization(ctx, items, { topN: items.length });
      const byId = new Map(items.map((it: any) => [it.id, it._chat]));
      const personalized = ranked.map((it: any) => byId.get(it.id)).filter(Boolean) as any[];
      const pinned = personalized.filter((c: any) => c.pinned);
      const rest = personalized.filter((c: any) => !c.pinned);
      const reordered = [...pinned, ...rest];
      result.splice(0, result.length, ...reordered);
      pMeta = { intent: { stated: ctx.intent.stated, revealed: ctx.intent.revealed, mismatch: ctx.intent.mismatch, confidence: ctx.intent.confidence }, diversifier: { mood: ctx.sessionMood, reasoning: diversifier.reasoning }, negativeSignals: { totalEvents: ctx.negProfile.totalEvents } };
    } catch { /* fallback to legacy pinned-first sort */ }
    res.json({ data: result, meta: pMeta || undefined });
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
      const previewContent = previewFromContent(lastContent);
      return {
        id: c.id,
        otherUser,
        lastMessage: lastMsg,
        lastMessagePreview: previewContent ? (previewContent.length > 50 ? previewContent.substring(0, 50) + '…' : previewContent) : null,
        lastMessageAt: lastMsg?.createdAt || c.updatedAt,
        unreadCount: 0,
      };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

// Find-or-create the 1:1 chat between the requesting user and `:userId`.
// Used by surfaces (story replies, profile actions) that drop into a thread
// without requiring it to exist already. Both orderings of (user1Id,user2Id)
// are searched so we don't accidentally create a duplicate.
app.post('/api/v1/messages/chats/with/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const me = req.userId!;
    const other = req.params.userId;
    if (!other || other === me) return res.status(400).json({ error: { message: 'Invalid recipient', code: 'BAD_REQUEST' } });
    let chat = await prisma.chat.findFirst({
      where: { OR: [{ user1Id: me, user2Id: other }, { user1Id: other, user2Id: me }] },
    });
    if (!chat) {
      // A chat requires an active match. If the two users aren't matched yet,
      // we can't create a chat for them.
      const match = await prisma.match.findFirst({
        where: { OR: [{ user1Id: me, user2Id: other }, { user1Id: other, user2Id: me }] },
      });
      if (!match) return res.status(404).json({ error: { message: 'No match between users', code: 'NOT_FOUND' } });
      chat = await prisma.chat.create({ data: { matchId: match.id, user1Id: me, user2Id: other } });
    }
    res.json({ data: { id: chat.id } });
  } catch (e) { next(e); }
});

app.get('/api/v1/messages/chats/:chatId/messages', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { cursor } = req.query;
    const userId = req.userId!;
    // Security: verify chat membership before revealing messages
    const { isMember } = await verifyChatMembership(chatId, userId);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const messages = await prisma.message.findMany({
      where: { chatId, deletedForAll: false, NOT: { deletedFor: { contains: userId } } },
      include: {
        sender: { select: { id: true, displayName: true, username: true } },
        replyTo: { select: { id: true, content: true, senderId: true, sender: { select: { displayName: true } } } },
      },
      orderBy: { createdAt: 'desc' }, take: 50,
      ...cursorOpt(cursor),
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

app.post('/api/v1/messages/chats/:chatId/messages', authMiddleware, idempotency(), validate({ body: sendMessageBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { chatId } = req.params;
    const { content: rawContent, type, replyToId, meta: msgMeta } = req.body as { content: string; type?: string; replyToId?: string; meta?: { suggestionSlotIndex?: number; suggestionHookCategory?: string; suggestionTone?: 'reflective' | 'casual' | 'tactile' | 'quick'; suggestionReceiverHash?: string } };
    const content = sanitize(rawContent || '');
    const userId = req.userId!;
    // Security: verify sender is a member of this chat
    const { isMember } = await verifyChatMembership(chatId, userId);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    if (!content.trim()) return res.status(400).json({ error: { message: 'Message content required', code: 'VALIDATION_ERROR' } });

    // ─── v3.6.0 anti-ghost (flag-gated, additive) ───
    // BEFORE writing, when this is the first message the SENDER has posted
    // to this chat: take a Spotlight-minute deposit. AFTER writing, if the
    // sender is replying to an existing chat that had a pending deposit
    // from the OTHER party within REPLY_WINDOW_MS, credit the receiver-now-
    // turned-replier with the +1 bonus.
    let antiGhostDeposit: { delta: number; refId: string } | null = null;
    if (isAntiGhostEnabled()) {
      try {
        const chatInfo = await prisma.chat.findUnique({ where: { id: chatId }, select: { matchId: true, user1Id: true, user2Id: true } });
        if (chatInfo) {
          const senderPriorCount = await prisma.message.count({ where: { chatId, senderId: userId } });
          if (senderPriorCount === 0) {
            const receiverId = chatInfo.user1Id === userId ? chatInfo.user2Id : chatInfo.user1Id;
            // History: ghosted recently? premium? depositsToday?
            const since30d = new Date(Date.now() - 30 * 86400000);
            const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
            const [ghostBurnRows, depositsTodayCount] = await Promise.all([
              prisma.spotlightLedger.count({ where: { userId, reason: 'chat_ghost_burn', createdAt: { gte: since30d } } }).catch(() => 0),
              prisma.spotlightLedger.count({ where: { userId, reason: 'chat_deposit', createdAt: { gte: startOfDay } } }).catch(() => 0),
            ]);
            // v3.6.0 — resolve premium via shared resolver (60s cache, fail-closed).
            const isPremium = await isUserPremium(prisma, userId);
            const history = {
              ghostedRecently: ghostBurnRows > 0,
              isPremium,
              depositsToday: depositsTodayCount,
            };
            const ev = depositForNewChat(userId, receiverId, chatInfo.matchId, history);
            if ('error' in ev && ev.error === 'daily_cap_exceeded') {
              return res.status(429).json({ error: { message: 'daily_chat_cap_reached', code: 'DAILY_CHAT_CAP' } });
            }
            const okEv = ev as { reason: string; delta: number; refId: string };
            await prisma.spotlightLedger.create({
              data: { userId, delta: okEv.delta, reason: okEv.reason, refId: okEv.refId, meta: { chatId, receiverId } },
            });
            antiGhostDeposit = { delta: okEv.delta, refId: okEv.refId };
          }
        }
      } catch (err) { logger.warn('anti-ghost deposit failed; continuing', err as any); }
    }
    // Encrypt the message content before storing
    const encryptedContent = encryptMessage(content);
    const message = await prisma.message.create({
      data: { chatId, senderId: userId, content: encryptedContent, type: type || 'text', replyToId },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
    });
    // ─── Anti-ghost reply-bonus ───
    // If this sender is replying for the first time in a chat that had a
    // pending deposit from the OTHER party, credit the *current sender*
    // (the receiver of the deposit) with the bonus.
    if (isAntiGhostEnabled()) {
      try {
        const chatInfo = await prisma.chat.findUnique({ where: { id: chatId }, select: { matchId: true, user1Id: true, user2Id: true } });
        if (chatInfo) {
          const otherId = chatInfo.user1Id === userId ? chatInfo.user2Id : chatInfo.user1Id;
          const senderPriorCount = await prisma.message.count({ where: { chatId, senderId: userId, id: { not: message.id } } });
          if (senderPriorCount === 0) {
            // First reply from this side → look for matching chat_deposit ledger row from other side
            const since = new Date(Date.now() - REPLY_WINDOW_MS);
            const pending = await prisma.spotlightLedger.findFirst({
              where: { userId: otherId, reason: 'chat_deposit', refId: chatInfo.matchId, createdAt: { gte: since } },
              orderBy: { createdAt: 'desc' },
            });
            if (pending) {
              // Avoid double bonus for same deposit
              const alreadyPaid = await prisma.spotlightLedger.findFirst({
                where: { userId, reason: 'chat_reply_bonus', refId: chatInfo.matchId },
              });
              if (!alreadyPaid) {
                const replyMs = Date.now() - pending.createdAt.getTime();
                const bonus = replyBonus(otherId, userId, chatInfo.matchId, replyMs);
                if (bonus) {
                  await prisma.spotlightLedger.create({
                    data: { userId, delta: bonus.delta, reason: bonus.reason, refId: bonus.refId, meta: { chatId, replyMs } },
                  });
                }
              }
            }
          }
        }
      } catch (err) { logger.warn('anti-ghost reply bonus failed; continuing', err as any); }
    }
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
    trackActivity(prisma, userId, 'message', 'chat', chatId, { type: type || 'text', hasReply: !!replyToId });
    // ─── v3.6.0 — server-side ratifier for `move.suggestion_accepted` ───
    // The web client emits this when the user taps a suggestion, but we
    // re-emit here so the KPI never trusts a client-only signal. Only
    // fires when the client passed the full meta block; we resolve the
    // receiverHash from the chat membership when the client did not
    // include it.
    if (msgMeta && typeof msgMeta.suggestionSlotIndex === 'number') {
      try {
        let receiverHash = msgMeta.suggestionReceiverHash;
        if (!receiverHash || receiverHash.length < 20 || receiverHash.length > 24) {
          const chatInfo = await prisma.chat.findUnique({ where: { id: chatId }, select: { user1Id: true, user2Id: true } });
          if (chatInfo) {
            const receiverId = chatInfo.user1Id === userId ? chatInfo.user2Id : chatInfo.user1Id;
            receiverHash = hashUid(receiverId);
          }
        }
        if (receiverHash) {
          emitServerEvent(prisma, userId, 'move.suggestion_accepted', {
            receiverHash,
            slotIndex: Math.max(0, Math.min(4, Math.floor(msgMeta.suggestionSlotIndex))),
            hookCategory: String(msgMeta.suggestionHookCategory || 'shared_interest').slice(0, 32),
            tone: msgMeta.suggestionTone || 'casual',
          }, chatId);
        }
      } catch (err) { logger.warn('move.suggestion_accepted emit failed', err as any); }
    }
  } catch (e) { next(e); }
});

app.put('/api/v1/messages/messages/:id', authMiddleware, validate({ body: messageEditBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sanitizedContent = sanitize(req.body.content || '');
    const encContent = encryptMessage(sanitizedContent);
    const message = await prisma.message.update({ where: { id: req.params.id, senderId: req.userId }, data: { content: encContent, editedAt: new Date() } });
    res.json({ data: { ...message, content: sanitizedContent } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/messages/:id/delete-for-me', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    // Security: verify user is a member of this chat
    const { isMember } = await verifyChatMembership(msg.chatId, req.userId!);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    // Use JSON array format for deletedFor to prevent substring matching issues
    let deletedForList: string[] = [];
    try { deletedForList = msg.deletedFor ? JSON.parse(msg.deletedFor) : []; } catch { deletedForList = msg.deletedFor ? msg.deletedFor.split(',') : []; }
    if (!deletedForList.includes(req.userId!)) deletedForList.push(req.userId!);
    await prisma.message.update({ where: { id: req.params.id }, data: { deletedFor: JSON.stringify(deletedForList) } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// delete-for-all with 2-hour window is defined below (after chat search)

app.post('/api/v1/messages/messages/:id/react', authMiddleware, validate({ body: messageReactBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ error: { message: 'Not found' } });
    // Security: verify user is a member of this chat
    const { isMember } = await verifyChatMembership(msg.chatId, req.userId!);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const reactions = msg.reactions ? JSON.parse(msg.reactions) : [];
    const idx = reactions.findIndex((r: any) => r.userId === req.userId);
    const emoji = sanitize(req.body.emoji || '');
    if (idx >= 0) reactions[idx].emoji = emoji;
    else reactions.push({ userId: req.userId, emoji });
    await prisma.message.update({ where: { id: req.params.id }, data: { reactions: JSON.stringify(reactions) } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/pin', authMiddleware, validate({ body: chatPinBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isMember, chat } = await verifyChatMembership(req.params.chatId, req.userId!);
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const field = chat.user1Id === req.userId ? 'pinned1' : 'pinned2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.pinned ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/mute', authMiddleware, validate({ body: chatMuteBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isMember, chat } = await verifyChatMembership(req.params.chatId, req.userId!);
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const field = chat.user1Id === req.userId ? 'muted1' : 'muted2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.muted ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/messages/chats/:chatId/archive', authMiddleware, validate({ body: chatArchiveBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isMember, chat } = await verifyChatMembership(req.params.chatId, req.userId!);
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: req.body.archived ?? true } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Unarchive
app.post('/api/v1/messages/chats/:chatId/unarchive', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isMember, chat } = await verifyChatMembership(req.params.chatId, req.userId!);
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const field = chat.user1Id === req.userId ? 'archived1' : 'archived2';
    await prisma.chat.update({ where: { id: req.params.chatId }, data: { [field]: false } });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Set chat theme/background
app.post('/api/v1/messages/chats/:chatId/theme', authMiddleware, validate({ body: chatThemeBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isMember } = await verifyChatMembership(req.params.chatId, req.userId!);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
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
    // Security: verify chat membership
    const { isMember } = await verifyChatMembership(req.params.chatId, userId);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    const messages = await prisma.message.findMany({ where: { chatId: req.params.chatId } });
    for (const msg of messages) {
      let deletedForList: string[] = [];
      try { deletedForList = msg.deletedFor ? JSON.parse(msg.deletedFor) : []; } catch { deletedForList = msg.deletedFor ? msg.deletedFor.split(',') : []; }
      if (!deletedForList.includes(userId)) deletedForList.push(userId);
      await prisma.message.update({ where: { id: msg.id }, data: { deletedFor: JSON.stringify(deletedForList) } });
    }
    auditLog(prisma, userId, 'chat_clear', { chatId: req.params.chatId, messageCount: messages.length });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// Search messages in a chat
app.get('/api/v1/messages/chats/:chatId/search', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const userId = req.userId!;
    if (!q) return res.json({ data: [] });
    // Security: verify chat membership before searching
    const { isMember } = await verifyChatMembership(req.params.chatId, userId);
    if (!isMember) return res.status(403).json({ error: { message: 'Access denied', code: 'FORBIDDEN' } });
    // Fetch all messages, decrypt in-memory, then filter (encrypted content can't be searched via SQL)
    const messages = await prisma.message.findMany({
      where: {
        chatId: req.params.chatId,
        deletedForAll: false,
        NOT: { deletedFor: { contains: userId } },
      },
      include: { sender: { select: { id: true, displayName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500, // cap to last 500 messages for performance
    });
    const query = (q as string).toLowerCase();
    const matched = messages
      .map(m => ({ ...m, content: decryptMessage(m.content) }))
      .filter(m => m.content.toLowerCase().includes(query))
      .slice(0, 20);
    res.json({ data: matched });
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
    auditLog(prisma, req.userId!, 'message_delete_for_all', { messageId: req.params.id, chatId: msg.chatId });
    res.json({ data: { success: true } });
  } catch (e) { next(e); }
});

// ── AI Conversation Helpers ──
// Get smart reply suggestions based on full conversation context, user behavior & relationship stage
app.post('/api/v1/messages/chats/:chatId/suggestions', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;

    // Check suggestion cache
    const cacheKey = `suggestions:${req.params.chatId}:${userId}:${req.body.context || 'auto'}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached) return res.json({ data: cached });

    const otherUser = await prisma.user.findUnique({ where: { id: otherId }, include: { profile: true, interests: true } });

    // Fetch last 20 messages for deep context analysis
    const recentMessages = await prisma.message.findMany({
      where: { chatId: req.params.chatId, deletedForAll: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // ── Conversation analysis ──
    const totalMessages = recentMessages.length;
    const myMessages = recentMessages.filter(m => m.senderId === userId);
    const theirMessages = recentMessages.filter(m => m.senderId !== userId);
    const lastMsg = recentMessages[0];
    const lastMsgContent = lastMsg ? decryptMessage(lastMsg.content) : '';
    const lastMsgIsFromMe = lastMsg?.senderId === userId;
    const otherInterests = otherUser?.interests?.map(i => i.name) || [];
    const otherCity = otherUser?.profile?.city || '';
    const otherProfession = otherUser?.profile?.profession || '';

    // ── Relationship stage detection ──
    let stage: 'new' | 'getting-to-know' | 'comfortable' | 'deep' = 'new';
    if (totalMessages > 30) stage = 'deep';
    else if (totalMessages > 15) stage = 'comfortable';
    else if (totalMessages > 3) stage = 'getting-to-know';

    // ── Sentiment analysis of last message ──
    const positiveWords = ['love', 'great', 'amazing', 'awesome', 'wonderful', 'fun', 'happy', 'excited', 'beautiful', 'incredible', 'perfect', 'sweet', 'cute', 'haha', 'lol', '😊', '😍', '❤️', '💕', '🥰'];
    const questionWords = ['what', 'how', 'where', 'when', 'why', 'who', 'which', 'do you', 'have you', 'are you', 'would you', 'could you', '?'];
    const greetings = ['hey', 'hi', 'hello', 'sup', 'what\'s up', 'good morning', 'good evening', 'hola'];
    const flirtyWords = ['cute', 'gorgeous', 'beautiful', 'handsome', 'attractive', 'hot', 'date', 'meet up', 'coffee', 'drinks', 'dinner'];
    const sadWords = ['sad', 'tired', 'exhausted', 'stressed', 'anxious', 'worried', 'bad day', 'rough', 'struggling', 'miss'];

    const lower = lastMsgContent.toLowerCase();
    const isPositive = positiveWords.some(w => lower.includes(w));
    const isQuestion = questionWords.some(w => lower.includes(w));
    const isGreeting = greetings.some(w => lower.startsWith(w));
    const isFlirty = flirtyWords.some(w => lower.includes(w));
    const isSad = sadWords.some(w => lower.includes(w));

    // ── Topic extraction from recent messages ──
    const topicKeywords: Record<string, string[]> = {
      travel: ['travel', 'trip', 'flight', 'vacation', 'visit', 'explore', 'country', 'city'],
      food: ['food', 'eat', 'cook', 'restaurant', 'dinner', 'lunch', 'breakfast', 'recipe', 'cuisine'],
      music: ['music', 'song', 'band', 'concert', 'playlist', 'album', 'singer', 'guitar'],
      movies: ['movie', 'film', 'watch', 'netflix', 'show', 'series', 'cinema', 'actor'],
      fitness: ['gym', 'workout', 'run', 'yoga', 'exercise', 'fitness', 'health', 'hike'],
      work: ['work', 'job', 'office', 'project', 'meeting', 'career', 'business', 'deadline'],
      hobbies: ['reading', 'book', 'art', 'paint', 'photo', 'dance', 'game', 'craft'],
    };
    const detectedTopics: string[] = [];
    const allContent = recentMessages.map(m => decryptMessage(m.content).toLowerCase()).join(' ');
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => allContent.includes(k))) detectedTopics.push(topic);
    }

    // ── Generate contextual suggestions ──
    const suggestions: { text: string; type: string; confidence: number }[] = [];
    const { context } = req.body;

    if (!lastMsg || totalMessages === 0) {
      // Brand new conversation
      suggestions.push(
        { text: `Hey ${otherUser?.displayName?.split(' ')[0] || 'there'}! How's your day going? 😊`, type: 'starter', confidence: 0.95 },
        { text: `I noticed we both love ${otherInterests[0] || 'creative things'}! What got you into it?`, type: 'interest', confidence: 0.90 },
      );
      if (otherCity) suggestions.push({ text: `How's life in ${otherCity}? I've always been curious about it!`, type: 'location', confidence: 0.85 });
      if (otherProfession) suggestions.push({ text: `${otherProfession} sounds fascinating! What's the best part?`, type: 'career', confidence: 0.82 });
      suggestions.push(
        { text: `If you could travel anywhere tomorrow, where would you go? ✈️`, type: 'fun', confidence: 0.78 },
        { text: `What's something you're passionate about that most people don't know?`, type: 'deep', confidence: 0.75 },
      );
    } else if (context === 'flirty' || (stage !== 'new' && isFlirty)) {
      suggestions.push(
        { text: `You know what I like about you? Your energy is contagious 💜`, type: 'flirty', confidence: 0.88 },
        { text: `I have a feeling we'd have an amazing time together 😉`, type: 'flirty', confidence: 0.85 },
        { text: `We should totally do something fun this weekend — any ideas?`, type: 'date', confidence: 0.90 },
      );
      if (stage === 'comfortable' || stage === 'deep') {
        suggestions.push({ text: `I've been thinking about you all day 😊`, type: 'flirty', confidence: 0.80 });
      }
    } else if (context === 'deep' || stage === 'deep') {
      suggestions.push(
        { text: `What's something you've learned about yourself recently?`, type: 'deep', confidence: 0.88 },
        { text: `If you could change one thing about the world, what would it be?`, type: 'deep', confidence: 0.85 },
        { text: `What does your ideal life look like 5 years from now?`, type: 'deep', confidence: 0.82 },
      );
    } else if (context === 'fun') {
      suggestions.push(
        { text: `Hot take: pineapple on pizza — yes or no? 🍕`, type: 'fun', confidence: 0.90 },
        { text: `If you won the lottery tomorrow, what's the first thing you'd do?`, type: 'fun', confidence: 0.87 },
        { text: `What's the most spontaneous thing you've ever done?`, type: 'fun', confidence: 0.85 },
      );
    } else if (isSad) {
      // Empathetic responses
      suggestions.push(
        { text: `I'm sorry you're going through that. Want to talk about it? I'm here 💙`, type: 'empathy', confidence: 0.95 },
        { text: `Sending you positive vibes! What would make your day better?`, type: 'empathy', confidence: 0.90 },
        { text: `That sounds tough. Remember, it's okay to not be okay sometimes.`, type: 'empathy', confidence: 0.85 },
      );
    } else if (isGreeting && !lastMsgIsFromMe) {
      suggestions.push(
        { text: `Hey! Great to hear from you 😊 What's going on?`, type: 'greeting', confidence: 0.92 },
        { text: `Hi! How's your ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} going?`, type: 'greeting', confidence: 0.88 },
      );
    } else if (isQuestion && !lastMsgIsFromMe) {
      // They asked a question — help user answer + ask back
      suggestions.push(
        { text: `That's a great question! For me, I'd say...`, type: 'answer', confidence: 0.90 },
        { text: `Hmm, let me think... I'd probably say...`, type: 'answer', confidence: 0.85 },
        { text: `Oh that's interesting! What about you?`, type: 'deflect', confidence: 0.78 },
      );
    } else {
      // Regular follow-up based on context & detected topics
      suggestions.push(
        { text: `That's really interesting! Tell me more 😊`, type: 'followup', confidence: 0.88 },
        { text: `I totally relate to that! For me it's similar because...`, type: 'relate', confidence: 0.85 },
      );
      // Topic-aware suggestions
      if (detectedTopics.includes('travel')) suggestions.push({ text: `Speaking of traveling, what's the best place you've been to?`, type: 'topic', confidence: 0.82 });
      if (detectedTopics.includes('food')) suggestions.push({ text: `What's your go-to comfort food? I'm always looking for recommendations!`, type: 'topic', confidence: 0.82 });
      if (detectedTopics.includes('music')) suggestions.push({ text: `What have you been listening to lately? I need new music recs!`, type: 'topic', confidence: 0.82 });
      if (detectedTopics.includes('movies')) suggestions.push({ text: `Have you seen anything good recently? I'm looking for recommendations!`, type: 'topic', confidence: 0.80 });
      if (detectedTopics.includes('fitness')) suggestions.push({ text: `How's your fitness journey going? I could use some motivation!`, type: 'topic', confidence: 0.80 });

      // Interest-based fallback
      if (otherInterests.length > 1) suggestions.push({ text: `By the way, I saw you're into ${otherInterests[Math.floor(Math.random() * otherInterests.length)]}! What's that like?`, type: 'interest', confidence: 0.78 });

      // Stage-appropriate escalation
      if (stage === 'comfortable') {
        suggestions.push({ text: `We should totally hang out sometime! What do you think?`, type: 'escalate', confidence: 0.75 });
      }
      if (stage === 'getting-to-know') {
        suggestions.push({ text: `What else are you up to today?`, type: 'casual', confidence: 0.80 });
      }
    }

    // Sort by confidence and return top 6
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const result = suggestions.slice(0, 6);

    // Track suggestion request
    trackActivity(prisma, userId, 'view', 'chat', req.params.chatId, { action: 'suggestions', context: context || 'auto', stage });

    // Cache for 2 minutes
    suggestionCache.set(cacheKey, result, TTL.CHAT_SUGGESTIONS);

    res.json({ data: result });
  } catch (e) { next(e); }
});

// ── v4 suggestion endpoint (flag-gated) ──
// Returns deterministic suggestion + moves picks via services/shared/src/algo.
// Independent from the legacy /suggestions endpoint so we can A/B safely.
app.post('/api/v1/messages/chats/:chatId/suggestions-v4', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!v4RankEnabled('messaging')) {
      return res.status(404).json({ error: { message: 'v4 messaging suggestions disabled' } });
    }
    const userId = req.userId!;
    const chat = await prisma.chat.findUnique({ where: { id: req.params.chatId } });
    if (!chat) return res.status(404).json({ error: { message: 'Not found' } });
    const otherId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;

    const reader = new PrismaSignalReader(prisma);
    const candHash = reader.hashOf(otherId);
    const candFeat = await reader.features(candHash);

    const lastMsg = await prisma.message.findFirst({
      where: { chatId: req.params.chatId, deletedForAll: false },
      orderBy: { createdAt: 'desc' },
    });
    const lastInboundKind = lastMsg && lastMsg.senderId !== userId
      ? (lastMsg.type === 'voice' ? 'voice'
        : lastMsg.type === 'image' ? 'photo'
        : lastMsg.type === 'gif' ? 'gif'
        : 'text')
      : null;

    const suggestions = suggestMessages({
      candFeatures: candFeat,
      lastInboundKind,
      ageSec: {},
      myIntent: null,
      candIntent: null,
      nowHour: new Date().getHours(),
    }, 3);

    const moves = suggestMoves({
      candFeatures: candFeat,
      lastUsedAgoSec: {},
      candLastAction: lastMsg && lastMsg.senderId !== userId
        ? { kind: lastInboundKind === 'voice' ? 'sent_voice' : lastInboundKind === 'photo' ? 'sent_photo' : 'sent_text', sec: Math.max(0, (Date.now() - new Date(lastMsg.createdAt).getTime()) / 1000) }
        : null,
      nowHour: new Date().getHours(),
      deepCompatAffinity: {},
      consent: 'full',
    }, 3);

    res.json({ data: { suggestions, moves, algo: 'v4' } });
  } catch (e) { next(e); }
});

// ── Harsh Words Detection ──
const HARSH_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'slut', 'whore', 'cunt', 'nigger', 'faggot', 'retard', 'kill yourself', 'die', 'kys', 'stfu', 'wtf', 'rape', 'molest', 'abuse', 'threat', 'bomb', 'terror'];
app.post('/api/v1/messages/check-content', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { content: rawCheckContent } = req.body;
  const content = rawCheckContent ? sanitize(rawCheckContent) : '';
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

    // Passive cleanup sweeps (idempotent, cheap).
    // 1) Ephemeral snaps viewed once but neither replayed nor saved → clear after 1h grace.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    prisma.beatEvent.updateMany({
      where: {
        viewCount: 1,
        mediaSaved: false,
        mediaCleared: false,
        firstViewedAt: { lt: oneHourAgo },
        content: { not: '' },
      },
      data: { content: '', mediaCleared: true },
    }).catch(() => {});
    // 2) Active beats where neither side acted in 48h → mark lost (streak broken).
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    prisma.beat.updateMany({
      where: {
        state: 'active',
        OR: [{ user1Id: userId }, { user2Id: userId }],
        AND: [
          { OR: [{ lastUser1: null }, { lastUser1: { lt: twoDaysAgo } }] },
          { OR: [{ lastUser2: null }, { lastUser2: { lt: twoDaysAgo } }] },
        ],
      },
      data: { state: 'lost', count: 0 },
    }).catch(() => {});

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
      // Scrub ephemeral media content for the receiver until they tap-to-view.
      // The sender always sees their own content. Saved or already-cleared snaps
      // pass through as-is (saved → permanent; cleared → empty content + flag).
      const MEDIA_TYPES = new Set(['photo','video','voice','music','gif','snap']);
      const scrubbedEvents = b.events.map(ev => {
        const isMine = ev.userId === userId;
        const isMedia = MEDIA_TYPES.has(ev.type);
        if (isMine || ev.mediaSaved || !isMedia) return ev;
        // Receiver: hide content until /view endpoint is hit
        return { ...ev, content: '', _ephemeralLocked: !ev.mediaCleared };
      });
      return {
        id: b.id, user: other, count: b.count, state: b.state, events: scrubbedEvents,
        iSentToday, theyCompletedToday, todayCompleted: iSentToday && theyCompletedToday,
        createdAt: b.createdAt, updatedAt: b.updatedAt,
      };
    });
    res.json({ data: result });
  } catch (e) { next(e); }
});

// ─── Beat ephemeral viewer endpoints (Snapchat-style) ─────────────────
// Tap = first view (single, ephemeral). After this view ends, the snap is
// cleaned up after a 1h grace window unless the receiver replays/saves it.
// Long-press = replay (second view) which AUTO-SAVES the snap into chat for
// both parties to keep. Save / screenshot / download also persist into chat.
const EPHEMERAL_GRACE_MS = 60 * 60 * 1000; // 1h grace before auto-clear

app.post('/api/v1/beats/events/:eventId/view', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const mode = (req.query.mode === 'replay' || req.body?.mode === 'replay') ? 'replay' : 'view';
    const ev = await prisma.beatEvent.findUnique({ where: { id: req.params.eventId }, include: { beat: true } });
    if (!ev) return res.status(404).json({ error: { message: 'Event not found' } });
    if (ev.beat.user1Id !== userId && ev.beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    if (ev.userId === userId) return res.status(400).json({ error: { message: 'Cannot view your own beat' } });
    if (ev.mediaSaved) {
      // Saved snaps are permanent in chat — return as-is regardless of mode.
      return res.json({ data: { content: ev.content, type: ev.type, viewCount: ev.viewCount, saved: true, cleared: false } });
    }
    if (ev.mediaCleared) {
      return res.status(410).json({ error: { message: 'Beat is no longer available' }, data: { cleared: true, viewCount: ev.viewCount } });
    }

    if (mode === 'replay') {
      // Replay only valid after the first view.
      if ((ev.viewCount || 0) < 1) return res.status(400).json({ error: { message: 'Tap to view first before replaying' } });
      if ((ev.viewCount || 0) >= 2) return res.status(410).json({ error: { message: 'Already replayed' } });
      // Concurrency-safe transition 1 → 2; only the winning request creates the audit chip.
      const upd = await prisma.beatEvent.updateMany({
        where: { id: ev.id, viewCount: 1, mediaSaved: false },
        data: { viewCount: 2, mediaSaved: true },
      });
      if (upd.count === 0) return res.status(410).json({ error: { message: 'Already replayed' } });
      await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:saved:${userId}:${ev.id}` } });
      pushToUser(ev.userId, 'beat-viewed', { eventId: ev.id, beatId: ev.beatId, viewerId: userId, viewCount: 2, replayed: true });
      pushToUser(ev.userId, 'beat-saved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId, auto: true });
      pushToUser(userId, 'beat-saved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId, auto: true });
      return res.json({ data: { content: ev.content, type: ev.type, viewCount: 2, saved: true, cleared: false, lastView: false } });
    }

    // First view (tap): single view, with 1h grace before cleanup.
    if ((ev.viewCount || 0) >= 1) {
      // Already viewed; tapping again does nothing (must long-press to replay).
      return res.status(409).json({ error: { message: 'Already viewed. Long-press to replay.' }, data: { viewCount: ev.viewCount, alreadyViewed: true } });
    }
    // Concurrency-safe 0 → 1 transition; loser of the race silently no-ops the audit chip.
    const updFirst = await prisma.beatEvent.updateMany({
      where: { id: ev.id, viewCount: 0 },
      data: { viewCount: 1, firstViewedAt: ev.firstViewedAt ?? new Date() },
    });
    if (updFirst.count === 0) {
      return res.status(409).json({ error: { message: 'Already viewed. Long-press to replay.' }, data: { alreadyViewed: true } });
    }
    await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:viewed:${userId}:${ev.id}` } }).catch(() => {});
    res.json({ data: { content: ev.content, type: ev.type, viewCount: 1, saved: false, cleared: false, replayAvailable: true } });
    pushToUser(ev.userId, 'beat-viewed', { eventId: ev.id, beatId: ev.beatId, viewerId: userId, viewCount: 1 });
    pushToUser(userId, 'beat-viewed', { eventId: ev.id, beatId: ev.beatId, viewerId: userId, viewCount: 1 });
  } catch (e) { next(e); }
});

// Save a beat into chat history → preserves it permanently for both users.
app.post('/api/v1/beats/events/:eventId/save', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const ev = await prisma.beatEvent.findUnique({ where: { id: req.params.eventId }, include: { beat: true } });
    if (!ev) return res.status(404).json({ error: { message: 'Event not found' } });
    if (ev.beat.user1Id !== userId && ev.beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    if (ev.mediaCleared) return res.status(410).json({ error: { message: 'Beat is no longer available' } });
    if (ev.mediaSaved) return res.json({ data: { saved: true, id: ev.id, alreadySaved: true } });
    const updated = await prisma.beatEvent.update({ where: { id: ev.id }, data: { mediaSaved: true } });
    await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:saved:${userId}:${ev.id}` } });
    const otherId = ev.beat.user1Id === userId ? ev.beat.user2Id : ev.beat.user1Id;
    pushToUser(otherId, 'beat-saved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    pushToUser(userId, 'beat-saved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    res.json({ data: { saved: true, id: updated.id } });
  } catch (e) { next(e); }
});

// Unsave (remove a saved snap from chat). Fully deletes the snap for both users.
app.post('/api/v1/beats/events/:eventId/unsave', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const ev = await prisma.beatEvent.findUnique({ where: { id: req.params.eventId }, include: { beat: true } });
    if (!ev) return res.json({ data: { unsaved: true, alreadyGone: true } });
    if (ev.beat.user1Id !== userId && ev.beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    // Drop only the `saved` markers for this snap; keep screenshot/download/view
    // markers so the chat still shows a full audit trail of who did what.
    {
      const savedRows = await prisma.beatEvent.findMany({
        where: { beatId: ev.beatId, type: 'system', content: { startsWith: '__system:saved:' } },
      }).catch(() => [] as any[]);
      const ids = savedRows.filter((r: any) => (r.content || '').endsWith(`:${ev.id}`)).map((r: any) => r.id);
      if (ids.length) await prisma.beatEvent.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
    }
    await prisma.beatEvent.delete({ where: { id: ev.id } }).catch(() => {});
    // Add an audit chip so chat clearly shows who unsaved.
    await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:unsaved:${userId}:${ev.id}` } }).catch(() => {});
    const otherId = ev.beat.user1Id === userId ? ev.beat.user2Id : ev.beat.user1Id;
    pushToUser(otherId, 'beat-unsaved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    pushToUser(userId, 'beat-unsaved', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    res.json({ data: { unsaved: true, deleted: true } });
  } catch (e) { next(e); }
});

// Screenshot detection (best-effort). Persists media into chat AND posts a
// system event for both parties so the sender knows.
app.post('/api/v1/beats/events/:eventId/screenshot', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const ev = await prisma.beatEvent.findUnique({ where: { id: req.params.eventId }, include: { beat: true } });
    if (!ev) return res.status(404).json({ error: { message: 'Event not found' } });
    if (ev.beat.user1Id !== userId && ev.beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    if (ev.mediaCleared) return res.status(410).json({ error: { message: 'Beat is no longer available' } });
    if (!ev.mediaSaved && !ev.mediaCleared) {
      await prisma.beatEvent.update({ where: { id: ev.id }, data: { mediaSaved: true } }).catch(() => {});
    }
    await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:screenshot:${userId}:${ev.id}` } });
    const otherId = ev.beat.user1Id === userId ? ev.beat.user2Id : ev.beat.user1Id;
    pushToUser(otherId, 'beat-screenshot', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    pushToUser(userId, 'beat-screenshot', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

// Download — saves locally on the device AND records in chat for both parties.
app.post('/api/v1/beats/events/:eventId/download', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const ev = await prisma.beatEvent.findUnique({ where: { id: req.params.eventId }, include: { beat: true } });
    if (!ev) return res.status(404).json({ error: { message: 'Event not found' } });
    if (ev.beat.user1Id !== userId && ev.beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Forbidden' } });
    if (ev.mediaCleared) return res.status(410).json({ error: { message: 'Beat is no longer available' } });
    if (!ev.mediaSaved) {
      await prisma.beatEvent.update({ where: { id: ev.id }, data: { mediaSaved: true } }).catch(() => {});
    }
    await prisma.beatEvent.create({ data: { beatId: ev.beatId, userId, type: 'system', content: `__system:downloaded:${userId}:${ev.id}` } });
    const otherId = ev.beat.user1Id === userId ? ev.beat.user2Id : ev.beat.user1Id;
    pushToUser(otherId, 'beat-downloaded', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    pushToUser(userId, 'beat-downloaded', { eventId: ev.id, beatId: ev.beatId, byUserId: userId });
    res.json({ data: { ok: true } });
  } catch (e) { next(e); }
});

app.post('/api/v1/beats/start', authMiddleware, validate({ body: beatStartBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

app.post('/api/v1/beats/:id/complete', authMiddleware, validate({ body: beatCompleteBodySchema }), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const beat = await prisma.beat.findUnique({ where: { id: req.params.id } });
    if (!beat) return res.status(404).json({ error: { message: 'Beat not found' } });
    if (beat.user1Id !== userId && beat.user2Id !== userId) return res.status(403).json({ error: { message: 'Not your beat' } });
    // ── BEAT STREAK STATE MACHINE ──
    // Beats track daily engagement streaks between two matched users.
    // State transitions: active → weak (missed) → lost (expired, count resets to 0) → archived
    //                    active → active (completed by both within 24h → count increments)
    //                    weak/lost → active (restored, count resets to 1)
    if (beat.state === 'lost' || beat.state === 'archived') return res.status(400).json({ error: { message: 'Beat is not active' } });
    const isUser1 = beat.user1Id === userId;
    const lastField = isUser1 ? 'lastUser1' : 'lastUser2';
    const otherLastField = isUser1 ? 'lastUser2' : 'lastUser1';
    const myLast = beat[lastField as keyof typeof beat] as Date | null;
    const otherLast = beat[otherLastField as keyof typeof beat] as Date | null;
    const now = new Date();
    const DAY = 86400000; // 24 hours in milliseconds

    // Prevent double-sending: each user can only complete once per 24h window
    const iAlreadySentToday = myLast && (now.getTime() - myLast.getTime()) < DAY;
    if (iAlreadySentToday) return res.status(400).json({ error: { message: 'You already sent a beat today! Come back tomorrow.' }, data: { iSentToday: true } });

    // Check if the OTHER user already completed today
    const otherCompletedToday = otherLast && (now.getTime() - otherLast.getTime()) < DAY;

    // KEY BUSINESS RULE: The streak counter only increments when BOTH users have
    // sent within the same 24h window. This prevents one-sided streak farming.
    // The increment happens on the second user's completion (the one that makes it mutual).
    const shouldIncrement = otherCompletedToday && !iAlreadySentToday;
    const newCount = shouldIncrement ? beat.count + 1 : beat.count;
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { [lastField]: now, count: newCount, state: 'active' } });
    await prisma.beatEvent.create({ data: { beatId: beat.id, userId, type: req.body.type || 'snap', content: sanitize(req.body.content || 'Daily beat! ⚡') } });
    trackActivity(prisma, userId, 'beat_complete', 'beat', beat.id, { count: newCount, incremented: shouldIncrement });
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
    const updated = await prisma.beat.update({ where: { id: req.params.id }, data: { state: 'weak' } });
    trackActivity(prisma, req.userId!, 'beat_miss', 'beat', req.params.id);
    res.json({ data: updated });
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

// ─── Communication Profile (for algorithm intelligence) ───────────────
// Returns aggregated communication metrics without exposing message content.
// Used by the social service to compute CommStyleVector for deep compatibility.
app.get('/api/v1/messages/comm-profile/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.userId;
    // Only allow the user themselves or internal service calls
    if (req.userId !== targetUserId) {
      // Allow internal service-to-service calls (same internal key)
      const internalKey = req.headers['x-internal-key'];
      if (internalKey !== env.internalServiceKey) {
        return res.status(403).json({ error: { message: 'Forbidden' } });
      }
    }

    // Fetch last 100 messages sent by this user across all chats
    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: targetUserId }, { user2Id: targetUserId }] },
      select: { id: true },
    });
    const chatIds = chats.map(c => c.id);
    if (chatIds.length === 0) {
      return res.json({ data: { avgWordCount: 5, emojiPerMessage: 0.2, questionRatio: 0.3, avgResponseTimeSec: 300, formalityScore: 0.5, messageCount: 0 } });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: { in: chatIds }, senderId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { content: true, createdAt: true, chatId: true },
    });

    if (messages.length === 0) {
      return res.json({ data: { avgWordCount: 5, emojiPerMessage: 0.2, questionRatio: 0.3, avgResponseTimeSec: 300, formalityScore: 0.5, messageCount: 0 } });
    }

    // Decrypt and analyze messages
    let totalWords = 0, totalEmoji = 0, totalQuestions = 0, formalWords = 0;
    const decrypted: string[] = [];
    for (const m of messages) {
      const text = decryptMessage(m.content);
      if (text === '[encrypted message]') continue;
      decrypted.push(text);
      const words = text.split(/\s+/).filter(Boolean);
      totalWords += words.length;
      totalEmoji += (text.match(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}]/gu) || []).length;
      if (text.includes('?')) totalQuestions++;
      // Formality heuristics
      const formalIndicators = ['would', 'could', 'perhaps', 'regarding', 'appreciate', 'however', 'furthermore'];
      const casualIndicators = ['lol', 'haha', 'omg', 'nah', 'gonna', 'wanna', 'btw', 'rn', 'tbh'];
      for (const w of words) {
        if (formalIndicators.includes(w.toLowerCase())) formalWords++;
        if (casualIndicators.includes(w.toLowerCase())) formalWords--;
      }
    }

    const count = decrypted.length || 1;
    const avgWordCount = Math.round(totalWords / count);
    const emojiPerMessage = Math.round((totalEmoji / count) * 100) / 100;
    const questionRatio = Math.round((totalQuestions / count) * 100) / 100;
    const formalityScore = Math.max(0, Math.min(1, 0.5 + (formalWords / (totalWords || 1)) * 5));

    // Compute average response time (look at message pairs in same chat)
    let totalResponseTime = 0, responseCount = 0;
    const chatGroups = new Map<string, typeof messages>();
    for (const m of messages) {
      if (!chatGroups.has(m.chatId)) chatGroups.set(m.chatId, []);
      chatGroups.get(m.chatId)!.push(m);
    }
    // For each chat, get the other user's messages to compute response timing
    for (const [chatId, myMsgs] of chatGroups.entries()) {
      const otherMsgs = await prisma.message.findMany({
        where: { chatId, senderId: { not: targetUserId } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { createdAt: true },
      });
      for (const myMsg of myMsgs) {
        // Find the most recent other-user message before this one
        const precedingMsg = otherMsgs.find(o => new Date(o.createdAt) < new Date(myMsg.createdAt));
        if (precedingMsg) {
          const diff = (new Date(myMsg.createdAt).getTime() - new Date(precedingMsg.createdAt).getTime()) / 1000;
          if (diff > 0 && diff < 86400) { // Within 24h = valid response
            totalResponseTime += diff;
            responseCount++;
          }
        }
      }
    }
    const avgResponseTimeSec = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 300;

    res.json({ data: { avgWordCount, emojiPerMessage, questionRatio, avgResponseTimeSec, formalityScore: Math.round(formalityScore * 100) / 100, messageCount: count } });
  } catch (e) { next(e); }
});

// ─── Sent Texts (for Miamo Move style extraction) ─────────────────────
// Returns last N sent message texts (decrypted) for the authenticated user only.
// Used by social service to extract writing style for generateSmartMoves().
app.get('/api/v1/messages/sent-texts/:userId', authMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.userId;
    // Security: only allow the user themselves or internal service calls
    if (req.userId !== targetUserId) {
      const internalKey = req.headers['x-internal-key'];
      if (internalKey !== env.internalServiceKey) {
        return res.status(403).json({ error: { message: 'Forbidden' } });
      }
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 30);

    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: targetUserId }, { user2Id: targetUserId }] },
      select: { id: true },
    });
    if (chats.length === 0) return res.json({ data: [] });

    const messages = await prisma.message.findMany({
      where: { chatId: { in: chats.map(c => c.id) }, senderId: targetUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { content: true, createdAt: true },
    });

    const texts = messages.map(m => decryptMessage(m.content)).filter(t => t !== '[encrypted message]' && t.length > 2);
    res.json({ data: texts });
  } catch (e) { next(e); }
});

// Error Handler
// Sentry's error handler reports the error before Miamo's handler converts
// it to the v3.0 envelope. No-op when SENTRY_DSN is unset.
app.use(sentry.errorHandler);
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, '0.0.0.0', () => { logger.info(`Miamo Messaging Service on port ${PORT}`); });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down messaging service...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Messaging service stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => { process.exit(1); }, 10000);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
