'use client';
// v3.2 — Talent Card. Lightweight (text-first, optional single image URL,
// no video). Replaces the old reel-style card to keep storage minimal while
// still letting people showcase what makes them interesting.
import Image from 'next/image';
import { Heart, MessageCircle, Send, MoreHorizontal, ExternalLink, Sparkles } from 'lucide-react';
import { catGradient, timeAgo, fmt } from './constants';

export interface TalentItem {
  id: string;
  authorId: string;
  type?: 'text' | 'image' | 'link';
  title: string;
  content: string;
  mediaUrl?: string | null;
  externalUrl?: string | null;
  views: number;
  reactionCount?: number;
  commentCount?: number;
  moveCount?: number;
  liked?: boolean;
  createdAt: string;
  category?: { name: string; color?: string; icon?: string };
  author?: {
    id: string;
    displayName: string;
    username?: string;
    verified?: boolean;
    profile?: { age?: number; city?: string; avatarGradient?: string };
  };
}

export function TalentCard({
  item, onLike, onComment, onMove, onMore, onOpenAuthor,
}: {
  item: TalentItem;
  onLike: () => void;
  onComment: () => void;
  onMove: () => void;
  onMore: () => void;
  onOpenAuthor: () => void;
}) {
  const cat = item.category?.name ?? 'general';
  const color = item.category?.color ?? '#C97856';
  const author = item.author;

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-token bg-miamo-card transition hover:shadow-soft"
      style={{ background: catGradient(color) }}
    >
      {/* Category strip */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${color}1f`, color }}
        >
          <Sparkles className="h-3 w-3" /> {cat}
        </span>
        <button onClick={onMore} className="grid h-8 w-8 place-items-center rounded-full text-text-muted hover:bg-black/[0.05]" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Author */}
      <button onClick={onOpenAuthor} className="mx-4 mt-2 flex items-center gap-2 text-left">
        <div
          className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: author?.profile?.avatarGradient ?? `linear-gradient(135deg, ${color}, #B8694A)` }}
        >
          {author?.displayName?.[0] ?? '?'}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-text-primary">
            {author?.displayName ?? 'Someone'}
            {author?.profile?.age ? `, ${author.profile.age}` : ''}
          </div>
          <div className="truncate text-[11px] text-text-muted">{author?.profile?.city ?? cat} · {timeAgo(item.createdAt)}</div>
        </div>
      </button>

      {/* Content body */}
      {item.mediaUrl && (
        <div className="mx-4 mt-3 overflow-hidden rounded-xl bg-black/[0.04] aspect-[4/3] relative">
          {/* External image URL only — no upload */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.mediaUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="px-4 pb-3 pt-3">
        <h3 className="text-[15px] font-semibold leading-snug text-text-primary">{item.title}</h3>
        {item.content ? (
          <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap">{item.content}</p>
        ) : null}
        {item.externalUrl ? (
          <a href={item.externalUrl} target="_blank" rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-rose-main hover:underline">
            <ExternalLink className="h-3 w-3" /> Open
          </a>
        ) : null}
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center justify-between border-t border-black/[0.04] bg-white/40 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-4 text-[12px] text-text-muted">
          <button onClick={onLike} className={`inline-flex items-center gap-1 transition ${item.liked ? 'text-rose-main' : 'hover:text-rose-main'}`}>
            <Heart className={`h-4 w-4 ${item.liked ? 'fill-rose-main' : ''}`} />
            {fmt(item.reactionCount ?? 0)}
          </button>
          <button onClick={onComment} className="inline-flex items-center gap-1 hover:text-text-primary">
            <MessageCircle className="h-4 w-4" /> {fmt(item.commentCount ?? 0)}
          </button>
          {(item.moveCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-600" title="Matches sparked from this work">
              <Sparkles className="h-3 w-3" /> {item.moveCount} match{(item.moveCount ?? 0) === 1 ? '' : 'es'}
            </span>
          )}
        </div>
        <button onClick={onMove}
          className="inline-flex items-center gap-1.5 rounded-full bg-rose-main px-3 py-1.5 text-[12px] font-semibold text-white shadow-button hover:shadow-md">
          <Send className="h-3.5 w-3.5" /> Send Move
        </button>
      </div>
    </article>
  );
}
