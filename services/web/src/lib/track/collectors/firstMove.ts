/**
 * First-move + DTM-revision telemetry — v6.5.
 *
 * Tiny helpers callers can use from chat compose / DTM screens to emit
 * the firstMove flag and the DTM revise/skip events. These don't install
 * any listeners — they just normalise the payload shape.
 */

import { track } from '../index';

/**
 * Emit `msg.send` with `firstMove: true` when this is the opening
 * message of a thread. Caller knows whether the thread had prior
 * messages (from chat store). Keeps payload size minimal.
 */
export function trackMsgSend(args: {
  threadId: string;
  recipientTid?: string;
  lengthChars?: number;
  hasMedia?: boolean;
  kind?: 'text' | 'voice' | 'media' | 'reaction';
  isFirstMove: boolean;
  composeMs?: number;
}): void {
  const p: Record<string, unknown> = {
    threadId: args.threadId,
    firstMove: args.isFirstMove,
  };
  if (args.recipientTid) p.tid = args.recipientTid;
  if (typeof args.lengthChars === 'number') p.len = args.lengthChars;
  if (typeof args.hasMedia === 'boolean') p.hasMedia = args.hasMedia;
  if (args.kind) p.kind = args.kind;
  if (typeof args.composeMs === 'number') p.d = args.composeMs;
  track('msg.send', p);
}

export function trackDtmQuestionSkip(topic: string, qid: string): void {
  track('dtm.question_skip', { topic, qid });
}

export function trackDtmAnswerRevise(args: {
  topic: string;
  qid: string;
  fromValue?: string | number;
  toValue?: string | number;
}): void {
  const p: Record<string, unknown> = { topic: args.topic, qid: args.qid };
  if (args.fromValue !== undefined) p.fromValue = args.fromValue;
  if (args.toValue !== undefined) p.toValue = args.toValue;
  track('dtm.answer_revise', p);
}
