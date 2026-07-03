'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
 children: ReactNode;
 fallback?: ReactNode;
}

interface ErrorBoundaryState {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
 constructor(props: ErrorBoundaryProps) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): ErrorBoundaryState {
 return { hasError: true, error };
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 if (process.env.NODE_ENV === 'development') {
 if (process.env.NODE_ENV === 'development') console.error('[ErrorBoundary]', error, info.componentStack);
 }
 }

 handleReset = () => {
 this.setState({ hasError: false, error: null });
 };

 handleGoHome = () => {
 this.setState({ hasError: false, error: null });
 if (typeof window !== 'undefined') {
 window.location.href = '/discover';
 }
 };

 render() {
 if (this.state.hasError) {
 if (this.props.fallback) return this.props.fallback;

 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] px-8 py-16 text-center">
 {/* Animated error illustration */}
 <div className="relative mb-6">
 <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50 flex items-center justify-center shadow-[0_8px_32px_rgba(239,68,68,0.08)]">
 <AlertTriangle className="w-8 h-8 text-red-400" />
 </div>
 <div className="absolute -inset-4 rounded-[28px] bg-red-400/5 animate-pulse-slow" />
 </div>

 <h3 className="text-lg font-bold text-text-primary mb-2">Something went wrong</h3>
 <p className="text-sm text-text-muted max-w-sm leading-relaxed mb-6">
 {process.env.NODE_ENV === 'development'
 ? this.state.error?.message || 'An unexpected error occurred'
 : "We hit a snag. Don't worry — your data is safe."}
 </p>

 <div className="flex items-center gap-3">
 <button
 onClick={this.handleReset}
 className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold btn-primary"
 >
 <RefreshCw className="w-4 h-4" /> Try Again
 </button>
 <button
 onClick={this.handleGoHome}
 className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium btn-glass"
 >
 <Home className="w-4 h-4" /> Go Home
 </button>
 </div>

 {process.env.NODE_ENV === 'development' && this.state.error && (
 <details className="mt-6 max-w-md text-left">
 <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
 Error details (dev only)
 </summary>
 <pre className="mt-2 p-3 rounded-xl bg-miamo-surface text-xs text-text-secondary overflow-auto max-h-40 border border-border/50">
 {this.state.error.stack}
 </pre>
 </details>
 )}
 </div>
 );
 }

 return this.props.children;
 }
}
