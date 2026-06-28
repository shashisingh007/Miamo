'use client';
// v3.4 — Talent Card. Shows Spotlight countdown for live posts and a delete
// (with refund window) for the author. Logs view dwell time on mount.
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, ExternalLink, Sparkles, Flame, Play, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import { catGradient, timeAgo, fmt } from './constants';
import { CountdownPill, DeleteRefundButton } from './SpotlightUI';
import { api } from '@/lib/api';

export interface TalentItem {
  id: string;
  authorId: string;
  type?: 'text' | 'image' | 'link' | 'video';
  mediaType?: 'text' | 'image' | 'video';
  title: string;
  content: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  externalUrl?: string | null;
  views: number;
  reactionCount?: number;
  beatCount?: number;
  commentCount?: number;
  moveCount?: number;
  liked?: boolean;
  status?: string;
  createdAt: string;
  expiresAt?: string | null;
  minutesPaid?: number;
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
  item, isMine, onLike, onComment, onMove, onMore, onOpenAuthor, onDeleted,
}: {
  item: TalentItem;
  isMine?: boolean;
  onLike: () => void;
  onComment: () => void;
  onMove: () => void;
  onMore: () => void;
  onOpenAuthor: () => void;
  onDeleted?: (refundedMinutes: number) => void;
}) {
  const cat = item.category?.name ?? 'general';
  const color = item.category?.color ?? '#C97856';
  const author = item.author;
  const beats = item.beatCount ?? item.reactionCount ?? 0;
  const trending = item.status === 'trending';

  // Persist a view ping when the card mounts. Best-effort, fire-and-forget.
  // Dwell time is tracked via the unmount handler in the parent page.
  const viewedRef = useRef(false);
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    api.viewCreativityItem(item.id).catch(() => {});
    return () => {
      const dwell = Date.now() - mountedAt.current;
      if (dwell > 1000) {
        api.viewCreativityItem(item.id, dwell).catch(() => {});
      }
    };
  }, [item.id]);

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-miamo-card transition hover:shadow-soft ${trending ? 'border-rose-main/60 ring-1 ring-rose-main/40' : 'border-token'}`}
      style={{ background: catGradient(color) }}
    >
      {/* Trending banner */}
      {trending && (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-rose-main px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          <Flame className="h-3 w-3" /> Trending
        </div>
      )}
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

      {/* Spotlight controls strip */}
      {(item.expiresAt || (isMine && item.minutesPaid)) && (
        <div className="mx-4 mt-2 flex items-center gap-2">
          {item.expiresAt && <CountdownPill expiresAt={item.expiresAt} />}
          {isMine && onDeleted && (
            <DeleteRefundButton
              itemId={item.id}
              createdAt={item.createdAt}
              minutesPaid={item.minutesPaid}
              onDeleted={onDeleted}
            />
          )}
        </div>
      )}

      {/* Content body — media tile.
          Rules:
            • Video: <video> if we have a real URL; otherwise thumbnail-poster
              with a centered play icon; otherwise a category-tinted placeholder
              with the play icon — the card ALWAYS shows a media slot for reels.
            • Image: <img> from mediaUrl or thumbnailUrl; placeholder otherwise.
            • Text/link: no media slot. */}
      {(() => {
        const kind = item.mediaType ?? item.type ?? 'text';
        const isVideo = kind === 'video';
        const isImage = kind === 'image';
        if (!isVideo && !isImage) return null;

        const poster = item.thumbnailUrl || undefined;
        const src = item.mediaUrl || undefined;
        const TypeBadge = (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            {isVideo ? <><VideoIcon className="h-3 w-3" /> Reel</> : <><ImageIcon className="h-3 w-3" /> Photo</>}
          </span>
        );

        return (
          <div className="mx-4 mt-3 relative overflow-hidden rounded-xl bg-black/[0.04] aspect-[4/3]">
            {isVideo && src ? (
              <video
                src={src}
                poster={poster}
                muted
                playsInline
                loop
                preload="metadata"
                onMouseEnter={(e) => { (e.currentTarget as HTMLVideoElement).play().catch(() => {}); }}
                onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                className="h-full w-full object-cover"
              />
            ) : isVideo && poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poster} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
            ) : isImage && (src || poster) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src || poster!} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              // Placeholder thumbnail — category-tinted gradient with type icon.
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: catGradient(color) }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-white/85 shadow-md backdrop-blur-sm" style={{ color }}>
                  {isVideo ? <Play className="h-7 w-7 fill-current" /> : <ImageIcon className="h-7 w-7" />}
                </div>
              </div>
            )}
            {/* Play overlay for any video tile (real or thumbnail-only) */}
            {isVideo && (src || poster) && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-black/55 text-white shadow-lg">
                  <Play className="h-6 w-6 fill-white" />
                </div>
              </div>
            )}
            {TypeBadge}
          </div>
        );
      })()}

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
          <button onClick={onLike} className={`inline-flex items-center gap-1 transition ${item.liked ? 'text-rose-main' : 'hover:text-rose-main'}`} title="Beat">
            <Heart className={`h-4 w-4 ${item.liked ? 'fill-rose-main' : ''}`} />
            {fmt(beats)}
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
        {!isMine && (
          <button onClick={onMove}
            className="inline-flex items-center gap-1.5 rounded-full bg-rose-main px-3 py-1.5 text-[12px] font-semibold text-white shadow-button hover:shadow-md">
            <Send className="h-3.5 w-3.5" /> Send Move
          </button>
        )}
      </div>
    </article>
  );
}
