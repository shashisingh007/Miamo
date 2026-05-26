'use client';

import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { track as mioTrack } from '@/lib/track';

// ─── Session ID (persisted per browser tab) ──────────
let _sessionId: string | null = null;
function getSessionId(): string {
 if (!_sessionId) {
 if (typeof window !== 'undefined') {
 _sessionId = sessionStorage.getItem('miamo_session') || `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
 sessionStorage.setItem('miamo_session', _sessionId);
 } else {
 _sessionId = `s_${Date.now()}`;
 }
 }
 return _sessionId;
}

// ─── Batched tracker: collects events and flushes in batches ──
// Events are accumulated in an in-memory queue and flushed either:
// 1. When the queue reaches BATCH_SIZE (8 events), OR
// 2. After FLUSH_INTERVAL (3s) timer fires, OR
// 3. On page unload/visibility-hidden (beforeunload + visibilitychange).
// This reduces network requests while ensuring no data loss on tab close.
const BATCH_SIZE = 8;
const FLUSH_INTERVAL = 3000; // 3s
let _eventQueue: Array<{ action: string; targetType: string; targetId?: string; metadata?: Record<string, any>; durationMs?: number }> = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
 if (_eventQueue.length === 0) return;
 const batch = _eventQueue.splice(0, BATCH_SIZE);
 for (const evt of batch) {
 api.trackActivity(evt.action, evt.targetType, evt.targetId, { ...evt.metadata, sessionId: getSessionId() }, evt.durationMs);
 }
 // If more remain, schedule another flush
 if (_eventQueue.length > 0 && !_flushTimer) {
 _flushTimer = setTimeout(() => { _flushTimer = null; flushQueue(); }, FLUSH_INTERVAL);
 }
}

function enqueue(action: string, targetType: string, targetId?: string, metadata?: Record<string, any>, durationMs?: number) {
 _eventQueue.push({ action, targetType, targetId, metadata, durationMs });
 // Bridge to v3.1 tracking pipeline (silent no-op until user grants consent
 // and NEXT_PUBLIC_TRACKING_ENABLED=1). This means every legacy-instrumented
 // action — discover swipe, message open, page view, dwell — flows into the
 // new aggregator without per-call-site changes.
 try { mioTrack(`legacy.${action}`, { tt: targetType, tid: targetId, d: durationMs, ...(metadata || {}) }); } catch { /* never break user flow */ }
 if (_eventQueue.length >= BATCH_SIZE) {
 flushQueue();
 } else if (!_flushTimer) {
 _flushTimer = setTimeout(() => { _flushTimer = null; flushQueue(); }, FLUSH_INTERVAL);
 }
}

// Flush remaining events when the user leaves the page.
// We use BOTH beforeunload (desktop browsers) and visibilitychange (mobile browsers)
// because mobile Safari doesn't reliably fire beforeunload.
if (typeof window !== 'undefined') {
 window.addEventListener('beforeunload', () => flushQueue());
 document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushQueue(); });
}

/**
 * Fire-and-forget activity tracking hook.
 * All calls are non-blocking, batched, and silently fail.
 */
export function useTrackActivity() {
 const track = useCallback(
 (action: string, targetType: string, targetId?: string, metadata?: Record<string, any>, durationMs?: number) => {
 enqueue(action, targetType, targetId, metadata, durationMs);
 },
 []
 );
 return track;
}

/**
 * Track page view on mount + dwell time on unmount. Only fires once per mount.
 * Replaces the need to call both useTrackPageView and useTrackDwell separately.
 */
export function useTrackPageView(page: string, metadata?: Record<string, any>) {
 const tracked = useRef(false);
 const startRef = useRef(Date.now());
 useEffect(() => {
 startRef.current = Date.now();
 if (!tracked.current) {
 tracked.current = true;
 enqueue('page_view', 'page', page, metadata);
 }
 return () => {
 const dwell = Date.now() - startRef.current;
 if (dwell > 2000) { // Only track if > 2s
 enqueue('page_dwell', 'page', page, { ...metadata, durationMs: dwell }, dwell);
 }
 };
 }, [page, metadata]);
}

/**
 * Track time spent on a page. Reports duration on unmount.
 */
export function useTrackDwell(page: string) {
 const startRef = useRef(Date.now());
 useEffect(() => {
 startRef.current = Date.now();
 return () => {
 const dwell = Date.now() - startRef.current;
 if (dwell > 2000) {
 enqueue('page_dwell', 'page', page, undefined, dwell);
 }
 };
 }, [page]);
}

/**
 * Track scroll depth on a page. Reports max scroll % on unmount.
 */
export function useTrackScrollDepth(page: string) {
 const maxScroll = useRef(0);
 useEffect(() => {
 maxScroll.current = 0;
 const handler = () => {
 const scrollTop = window.scrollY || document.documentElement.scrollTop;
 const docHeight = document.documentElement.scrollHeight - window.innerHeight;
 if (docHeight > 0) {
 const pct = Math.round((scrollTop / docHeight) * 100);
 if (pct > maxScroll.current) maxScroll.current = pct;
 }
 };
 window.addEventListener('scroll', handler, { passive: true });
 return () => {
 window.removeEventListener('scroll', handler);
 if (maxScroll.current > 5) {
 enqueue('scroll_depth', 'page', page, { depth: maxScroll.current });
 }
 };
 }, [page]);
}

/**
 * Track button/element clicks with identifier.
 */
export function trackClick(elementId: string, metadata?: Record<string, any>) {
 enqueue('button_click', 'ui', elementId, metadata);
}

/**
 * Track filter changes.
 */
export function trackFilterChange(filterName: string, filterValues: Record<string, any>) {
 enqueue('filter_change', 'filter', filterName, filterValues);
}

/**
 * Track settings changes.
 */
export function trackSettingsChange(settingKey: string, newValue: any) {
 enqueue('settings_change', 'settings', settingKey, { value: newValue });
}

/**
 * Track content engagement (like/comment/share on feed/creativity/stories).
 */
export function trackContentEngage(action: 'like' | 'comment' | 'share' | 'hide' | 'report', contentType: string, contentId: string, metadata?: Record<string, any>) {
 enqueue('content_engage', contentType, contentId, { engageAction: action, ...metadata });
}

/**
 * Track photo carousel viewing — which photos, how long per photo.
 */
export function useTrackPhotoViews() {
 const photoStart = useRef<{ id: string; time: number } | null>(null);

 const onPhotoView = useCallback((photoId: string) => {
 // Report previous photo dwell
 if (photoStart.current && photoStart.current.id !== photoId) {
 const dwell = Date.now() - photoStart.current.time;
 if (dwell > 500) enqueue('photo_view', 'photo', photoStart.current.id, undefined, dwell);
 }
 photoStart.current = { id: photoId, time: Date.now() };
 }, []);

 const flush = useCallback(() => {
 if (photoStart.current) {
 const dwell = Date.now() - photoStart.current.time;
 if (dwell > 500) enqueue('photo_view', 'photo', photoStart.current.id, undefined, dwell);
 photoStart.current = null;
 }
 }, []);

 return { onPhotoView, flushPhotoTracking: flush };
}

/**
 * Track story view with completion rate.
 */
export function trackStoryView(storyId: string, authorId: string, completionRate: number, durationMs: number) {
 enqueue('story_view', 'story', storyId, { authorId, completionRate }, durationMs);
}

/**
 * Track notification click.
 */
export function trackNotificationClick(notificationId: string, notificationType: string) {
 enqueue('notification_click', 'notification', notificationId, { type: notificationType });
}

/**
 * Track match actions (accept/decline/unmatch).
 */
export function trackMatchAction(action: 'accept' | 'decline' | 'unmatch', matchId: string, targetUserId?: string) {
 enqueue('match_action', 'match', matchId, { matchAction: action, targetUserId });
}

/**
 * Track beat engagement.
 */
export function trackBeatAction(action: 'send' | 'receive' | 'play' | 'like', beatId: string, metadata?: Record<string, any>) {
 enqueue(`beat_${action}`, 'beat', beatId, metadata);
}

/**
 * Track message actions.
 */
export function trackMessageAction(action: 'sent' | 'read', chatId: string, metadata?: Record<string, any>) {
 enqueue(`message_${action}`, 'chat', chatId, metadata);
}

/**
 * Track search queries with results count.
 */
export function trackSearchQuery(query: string, searchType: string, resultCount: number) {
 enqueue('search_query', 'search', undefined, { query, searchType, resultCount });
}
