'use client';
// ─── Miamo SSE (Server-Sent Events) Hook ─────────────
// Connects to the gateway SSE stream and dispatches real-time events
import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

type SSEHandler = (data: any) => void;

// ─── Global SSE Singleton ───────────────────────────
// A single EventSource is shared across ALL components in the app.
// This prevents multiple SSE connections per tab (which would waste server resources).
// Components subscribe via useSSE() but don't own the connection lifecycle.
let globalSource: EventSource | null = null;
let globalHandlers = new Map<string, Set<SSEHandler>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let currentToken: string | null = null;

function getToken(): string | null {
 if (typeof window === 'undefined') return null;
 return useAuthStore.getState().token;
}

function connectSSE() {
 const token = getToken();
 if (!token) return;
 if (globalSource && currentToken === token) return; // already connected

 // Close existing connection if token changed
 if (globalSource) {
 globalSource.close();
 globalSource = null;
 }

 currentToken = token;
 const url = `${API_URL}/api/v1/events/stream`;

 // EventSource doesn't support custom headers (browser limitation).
 // We pass the JWT as a query parameter instead. The gateway's SSE endpoint
 // accepts both Authorization header and ?token= for this reason.
 const source = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
 globalSource = source;

 source.onopen = () => {
 reconnectAttempts = 0;
 if (process.env.NODE_ENV !== 'production') console.log('[SSE] Connected');
 };

 source.onerror = () => {
 source.close();
 globalSource = null;
 currentToken = null;
 if (reconnectTimer) clearTimeout(reconnectTimer);
 // Exponential backoff with jitter, cap 30s. Prevents reconnect spam when gateway is down.
 const base = Math.min(30000, 1000 * Math.pow(2, reconnectAttempts));
 const delay = base / 2 + Math.random() * (base / 2);
 reconnectAttempts++;
 if (process.env.NODE_ENV !== 'production') console.log(`[SSE] disconnected, reconnect in ${Math.round(delay)}ms (attempt ${reconnectAttempts})`);
 reconnectTimer = setTimeout(connectSSE, delay);
 };

 // Listen for all custom events we care about
 const events = [
 'new-message', 'message-sent', 'new-notification', 'beat-update', 'chat-update',
 'beat-viewed', 'beat-saved', 'beat-unsaved', 'beat-screenshot', 'beat-downloaded',
 ];
 for (const eventName of events) {
 source.addEventListener(eventName, (e: MessageEvent) => {
 try {
 const data = JSON.parse(e.data);
 const handlers = globalHandlers.get(eventName);
 if (handlers) {
 handlers.forEach((handler) => {
 try { handler(data); } catch {}
 });
 }
 } catch {}
 });
 }
}

function disconnectSSE() {
 if (globalSource) {
 globalSource.close();
 globalSource = null;
 currentToken = null;
 }
 if (reconnectTimer) {
 clearTimeout(reconnectTimer);
 reconnectTimer = null;
 }
}

/**
 * useSSE — subscribe to real-time SSE events
 * @param eventName - the SSE event type (e.g. 'new-message', 'new-notification')
 * @param handler - callback when that event fires
 * @param enabled - whether to activate (default: true)
 */
export function useSSE(eventName: string, handler: SSEHandler, enabled = true) {
 const handlerRef = useRef(handler);
 handlerRef.current = handler;

 const stableHandler = useCallback((data: any) => {
 handlerRef.current(data);
 }, []);

 useEffect(() => {
 if (!enabled) return;

 // Ensure connection is active
 connectSSE();

 // Register handler
 if (!globalHandlers.has(eventName)) {
 globalHandlers.set(eventName, new Set());
 }
 globalHandlers.get(eventName)!.add(stableHandler);

 return () => {
 globalHandlers.get(eventName)?.delete(stableHandler);
 if (globalHandlers.get(eventName)?.size === 0) {
 globalHandlers.delete(eventName);
 }
 // Don't disconnect — other components may still use it
 };
 }, [eventName, stableHandler, enabled]);
}

/**
 * useSSEConnection — manages the SSE lifecycle tied to auth state
 * Call this once in the main layout
 */
export function useSSEConnection(isAuthenticated: boolean) {
 // Token is held in memory and may be null on fresh page load until the
 // first request triggers a cookie-based refresh. Re-run when it arrives
 // so SSE actually connects after auth bootstrap.
 const token = useAuthStore((s) => s.token);
 useEffect(() => {
 if (isAuthenticated && token) {
 connectSSE();
 } else if (!isAuthenticated) {
 disconnectSSE();
 }
 return () => {
 // Don't disconnect on unmount — layout stays mounted
 };
 }, [isAuthenticated, token]);
}
