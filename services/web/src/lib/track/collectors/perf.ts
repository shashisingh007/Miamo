/**
 * Web Vitals + paint timing collector.
 *
 * Reports LCP, FID/INP, CLS, TTFB using PerformanceObserver where available.
 * Single emission per metric per page. No dep on the `web-vitals` package —
 * this is a tiny inline implementation that covers the basics.
 */

type Emit = (event: { e: string; p?: Record<string, unknown> }) => void;

export function installPerf(emit: Emit): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => undefined;
  }
  const observers: PerformanceObserver[] = [];

  // LCP — largest contentful paint
  try {
    const lcp = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      if (last) emit({ e: 'perf.web_vitals', p: { metric: 'LCP', value: Math.round(last.startTime) } });
    });
    lcp.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcp);
  } catch { /* unsupported */ }

  // CLS — cumulative layout shift
  let cls = 0;
  try {
    const clsObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput?: boolean }>) {
        if (!e.hadRecentInput) cls += e.value;
      }
    });
    clsObs.observe({ type: 'layout-shift', buffered: true });
    observers.push(clsObs);
  } catch { /* unsupported */ }

  // INP — interaction to next paint (event timing)
  let inp = 0;
  try {
    const evtObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<PerformanceEntry & { duration: number }>) {
        if (e.duration > inp) inp = e.duration;
      }
    });
    evtObs.observe({ type: 'event', durationThreshold: 16, buffered: true } as PerformanceObserverInit & { durationThreshold: number });
    observers.push(evtObs);
  } catch { /* unsupported */ }

  // TTFB — from navigation timing
  try {
    const nav = performance.getEntriesByType('navigation')[0] as (PerformanceNavigationTiming | undefined);
    if (nav) emit({ e: 'perf.web_vitals', p: { metric: 'TTFB', value: Math.round(nav.responseStart) } });
  } catch { /* ignore */ }

  // Report CLS + INP at hide-time
  const onHide = (): void => {
    if (cls > 0) emit({ e: 'perf.web_vitals', p: { metric: 'CLS', value: Math.round(cls * 1000) / 1000 } });
    if (inp > 0) emit({ e: 'perf.web_vitals', p: { metric: 'INP', value: Math.round(inp) } });
  };
  window.addEventListener('pagehide', onHide, { once: true });

  return () => {
    observers.forEach((o) => o.disconnect());
    window.removeEventListener('pagehide', onHide);
  };
}
