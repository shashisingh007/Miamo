'use client';
// ─── Miamo SSE (Server-Sent Events) Hook ─────────────
// Connects to the gateway SSE stream and dispatches real-time events
import { useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3200';

type SSEHandler = (data: any) => void;

// ─── Global SSE Singleton ───────────────────────────
// A single EventSource is shared across ALL components in the app.
// This prevents multiple SSE connections per tab (which would waste server resources).
// Components subscribe via useSSE() but don't own the connection lifecycle.
let globalSource: EventSource | null = null;
let globalHandlers = new Map<string, Set<SSEHandler>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentToken: string | null = null;

function getToken(): string | null {
 if (typeof window === 'undefined') return null;
 return localStorage.getItem('miamo_token');
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
 console.log('[SSE] Connected');
 };

 source.onerror = () => {
 console.log('[SSE] Error/disconnected, reconnecting in 3s...');
 source.close();
 globalSource = null;
 currentToken = null;
 if (reconnectTimer) clearTimeout(reconnectTimer);
 reconnectTimer = setTimeout(connectSSE, 3000);
 };

 // Listen for all custom events we care about
 const events = ['new-message', 'message-sent', 'new-notification', 'beat-update', 'chat-update'];
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
 useEffect(() => {
 if (isAuthenticated) {
 connectSSE();
 } else {
 disconnectSSE();
 }
 return () => {
 // Don't disconnect on unmount — layout stays mounted
 };
 }, [isAuthenticated]);
}
