// Miamo Mobile — Activity tracking hook.
// Ported from services/web/src/hooks/useTrackActivity.ts. Web-specific bits
// replaced:
//   - `sessionStorage` → in-memory sessionId (RN has no separate session
//     storage; process lifetime is a good enough scope for tap-behaviour).
//   - Page Visibility API → AppState from react-native.
//   - No `mioTrack` bridge — that lives in web/src/lib/track and depends on
//     the browser IndexedDB shim. Mobile can add its own adapter later.
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { api } from '@lib/api';

let _sessionId: string | null = null;
function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
  return _sessionId;
}

const BATCH_SIZE = 8;
const FLUSH_INTERVAL = 3000;
type Event = {
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
};
let _eventQueue: Event[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;

function flushQueue() {
  if (_eventQueue.length === 0) return;
  const batch = _eventQueue.splice(0, BATCH_SIZE);
  for (const evt of batch) {
    api.trackActivity(
      evt.action,
      evt.targetType,
      evt.targetId,
      { ...(evt.metadata || {}), sessionId: getSessionId() },
      evt.durationMs,
    );
  }
  if (_eventQueue.length > 0 && !_flushTimer) {
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      flushQueue();
    }, FLUSH_INTERVAL);
  }
}

// Test hook — lets unit tests reset queue state between assertions.
export function __resetTrackingForTests() {
  _eventQueue = [];
  if (_flushTimer) {
    clearTimeout(_flushTimer);
    _flushTimer = null;
  }
  _sessionId = null;
}

export function __getQueueLengthForTests(): number {
  return _eventQueue.length;
}

function enqueue(
  action: string,
  targetType: string,
  targetId?: string,
  metadata?: Record<string, any>,
  durationMs?: number,
) {
  _eventQueue.push({ action, targetType, targetId, metadata, durationMs });
  if (_eventQueue.length >= BATCH_SIZE) {
    flushQueue();
  } else if (!_flushTimer) {
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      flushQueue();
    }, FLUSH_INTERVAL);
  }
}

// Global AppState listener — flush on background transitions. Idempotent:
// only registered once per module load.
let _appStateSubscribed = false;
function ensureAppStateHook() {
  if (_appStateSubscribed) return;
  _appStateSubscribed = true;
  try {
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') flushQueue();
    });
  } catch {
    // AppState not available in test env — swallow.
  }
}
ensureAppStateHook();

export function useTrackActivity() {
  const track = useCallback(
    (
      action: string,
      targetType: string,
      targetId?: string,
      metadata?: Record<string, any>,
      durationMs?: number,
    ) => {
      enqueue(action, targetType, targetId, metadata, durationMs);
    },
    [],
  );
  return track;
}

/**
 * Screen view + dwell tracker. Reports 'page_view' on focus and 'page_dwell'
 * on unmount when dwell > 2s. Matches the web hook of the same name.
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
      if (dwell > 2000) {
        enqueue('page_dwell', 'page', page, { ...(metadata || {}), durationMs: dwell }, dwell);
      }
    };
  }, [page, metadata]);
}

export function trackClick(elementId: string, metadata?: Record<string, any>) {
  enqueue('button_click', 'ui', elementId, metadata);
}
