/**
 * Gallery interactions — image zoom (wheel + pinch) and long-press.
 *
 * Captures intent signals that go beyond `card.photo.swipe`: when the user
 * actually leans in and inspects a photo, that's a strong like-bias signal
 * for the algorithm. The rollup worker rolls these up into FocusAffinity
 * and FeatureSnapshot.
 */

type Emit = (event: { e: string; p?: Record<string, unknown>; tid?: string; tt?: string; d?: number }) => void;

const LONG_PRESS_MS = 600;

function targetIdOf(el: HTMLElement | null): string | undefined {
  if (!el) return undefined;
  const node = el.closest('[data-mio-target-id]') as HTMLElement | null;
  return node?.dataset.mioTargetId;
}

export function installGallery(emit: Emit): () => void {
  if (typeof window === 'undefined') return () => undefined;

  // Ctrl/Cmd + wheel on an <img> = zoom
  const onWheel = (e: WheelEvent): void => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const target = e.target as HTMLElement;
    if (!target || target.tagName !== 'IMG') return;
    emit({
      e: 'gallery.zoom',
      tt: 'photo',
      tid: targetIdOf(target),
      p: { dy: Math.sign(e.deltaY), kind: 'wheel' },
    });
  };

  // Pinch zoom — touchstart with 2 fingers; emit on touchend with delta.
  let pinchStartDist = 0;
  const dist = (a: Touch, b: Touch): number => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 2) pinchStartDist = dist(e.touches[0], e.touches[1]);
  };
  const onTouchEnd = (e: TouchEvent): void => {
    if (pinchStartDist > 0 && e.changedTouches.length >= 1) {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'IMG') {
        emit({
          e: 'gallery.zoom',
          tt: 'photo',
          tid: targetIdOf(target),
          p: { kind: 'pinch', startDist: Math.round(pinchStartDist) },
        });
      }
      pinchStartDist = 0;
    }
  };

  // Long-press on photo = "show me more"
  let lpTimer: ReturnType<typeof setTimeout> | null = null;
  let lpTarget: HTMLElement | null = null;
  let lpStart = 0;
  const onPointerDown = (e: PointerEvent): void => {
    const t = e.target as HTMLElement;
    if (!t || t.tagName !== 'IMG') return;
    lpTarget = t;
    lpStart = performance.now();
    lpTimer = setTimeout(() => {
      if (lpTarget) {
        emit({
          e: 'gallery.long_press',
          tt: 'photo',
          tid: targetIdOf(lpTarget),
          d: Math.round(performance.now() - lpStart),
        });
      }
    }, LONG_PRESS_MS);
  };
  const onPointerUp = (): void => {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    lpTarget = null;
  };

  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('pointerup', onPointerUp, { passive: true });
  window.addEventListener('pointercancel', onPointerUp, { passive: true });

  return () => {
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };
}
