'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback, useId } from 'react';

/* ═══════════════════════════════════════════════════════════════
   MIAMO LOGO v12 — JS-DRIVEN ELLIPTICAL ORBIT WITH FX
   ─────────────────────────────────────────────────────
   Heart orbits an elliptical path around the word "miamo" using
   requestAnimationFrame. Trail particles, rocket streaks, stars
   and ripples burst from the heart as it moves. When it arrives
   at the "ı" position it rests as the dot with a gentle pulse.
   ═══════════════════════════════════════════════════════════════ */

const FONT = "var(--font-brand), 'Cormorant Garamond', 'Playfair Display', Georgia, serif";

const CFG = {
  orbitDuration: 5400,
  dotActionDuration: 1800,
  holdDuration: 700,
  trailGap: 48,
};

/* ─── GEOMETRY HELPERS ────────────────────────────────────── */
interface Geom {
  cx: number; cy: number;
  rx: number; ry: number;
  tilt: number;
  dotX: number; dotY: number;
  startTheta: number;
  startX: number; startY: number;
}

function ellipsePoint(geom: Geom, theta: number) {
  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosP = Math.cos(geom.tilt), sinP = Math.sin(geom.tilt);
  return {
    x: geom.cx + geom.rx * cosT * cosP - geom.ry * sinT * sinP,
    y: geom.cy + geom.rx * cosT * sinP + geom.ry * sinT * cosP,
  };
}

function findStartTheta(geom: Geom, tx: number, ty: number) {
  let bestTheta = 0, bestDist = Infinity;
  for (let i = 0; i < 1400; i++) {
    const theta = (Math.PI * 2 * i) / 1400;
    const p = ellipsePoint(geom, theta);
    const dx = p.x - tx, dy = p.y - ty;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; bestTheta = theta; }
  }
  return bestTheta;
}

function buildGeometry(
  stageEl: HTMLElement,
  logoEl: HTMLElement,
  iStemEl: HTMLElement,
): Geom {
  const s = stageEl.getBoundingClientRect();
  const l = logoEl.getBoundingClientRect();
  const i = iStemEl.getBoundingClientRect();

  const logoLeft = l.left - s.left;
  const logoTop = l.top - s.top;
  const logoW = l.width;
  const logoH = l.height;

  const geom: Geom = {
    cx: logoLeft + logoW / 2,
    cy: logoTop + logoH * 0.56,
    rx: logoW * 0.45,
    ry: logoH * 0.24,
    tilt: 0.34,
    dotX: i.left - s.left + i.width / 2,
    dotY: i.top - s.top + Math.max(4, logoH * 0.018),
    startTheta: 0,
    startX: 0,
    startY: 0,
  };

  geom.startTheta = findStartTheta(geom, geom.dotX, geom.dotY);
  let sp = ellipsePoint(geom, geom.startTheta);
  geom.cx += geom.dotX - sp.x;
  geom.cy += geom.dotY - sp.y;
  sp = ellipsePoint(geom, geom.startTheta);
  geom.startX = sp.x;
  geom.startY = sp.y;

  return geom;
}

/* ─── EASING ─────────────────────────────────────────────── */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/* ─── PARTICLE FACTORY ───────────────────────────────────── */
function spawnTrail(container: HTMLElement, x: number, y: number) {
  const el = document.createElement('span');
  el.className = 'miamo-trail-seg';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.setProperty('--dx', `${(Math.random() - 0.5) * 16}px`);
  el.style.setProperty('--dy', `${(Math.random() - 0.5) * 16}px`);
  container.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function spawnRocketStreak(container: HTMLElement, x: number, y: number, angle: number) {
  const el = document.createElement('span');
  el.className = 'miamo-rocket-streak';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.setProperty('--rot', `${angle}rad`);
  el.style.setProperty('--dx', `${Math.cos(angle) * 10}px`);
  el.style.setProperty('--dy', `${Math.sin(angle) * 10}px`);
  container.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function spawnStar(container: HTMLElement, x: number, y: number) {
  const el = document.createElement('span');
  el.className = 'miamo-star';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.setProperty('--dx', `${(Math.random() - 0.5) * 22}px`);
  el.style.setProperty('--dy', `${(Math.random() - 0.5) * 22}px`);
  container.appendChild(el);
  setTimeout(() => el.remove(), 880);
}

function spawnRipple(container: HTMLElement, x: number, y: number) {
  const el = document.createElement('span');
  el.className = 'miamo-ripple';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

function burst(container: HTMLElement, x: number, y: number, count = 6) {
  for (let k = 0; k < count; k++) {
    spawnStar(container, x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8);
  }
}

/* ─── ANIMATE HELPER ─────────────────────────────────────── */
function animateFrame(
  duration: number,
  draw: (p: number, raw: number, now: number) => void,
  easing: (t: number) => number = (t) => t,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    function frame(now: number) {
      const raw = Math.min(1, (now - start) / duration);
      draw(easing(raw), raw, now);
      if (raw < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

/* ─── MAIN WORDMARK ───────────────────────────────────────── */
export function MiamoWordmark({
  height = 28,
  className = '',
  animated = true,
}: {
  height?: number;
  className?: string;
  animated?: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const iStemRef = useRef<HTMLSpanElement>(null);
  const heartRef = useRef<HTMLDivElement>(null);
  const traceBackRef = useRef<HTMLDivElement>(null);
  const traceFrontRef = useRef<HTMLDivElement>(null);
  const fxLayerRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const cancelRef = useRef(false);

  const heartSize = Math.max(8, Math.round(height * 0.34));

  const setHeart = useCallback((x: number, y: number, scale = 1, rotate = 0, opacity = 1) => {
    const el = heartRef.current;
    if (!el) return;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.opacity = String(opacity);
    el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotate}deg)`;
  }, []);

  useEffect(() => {
    if (!animated) return;
    if (!stageRef.current || !logoRef.current || !iStemRef.current || !heartRef.current) return;

    cancelRef.current = false;
    if (runningRef.current) return;
    runningRef.current = true;

    let lastTrail = 0;
    // Scale FX density based on font size — less particles for smaller logos
    const fxScale = Math.min(1, height / 60);
    const trailGapScaled = CFG.trailGap / fxScale;

    async function orbitPhase(geom: Geom) {
      lastTrail = 0;
      const heartEl = heartRef.current!;
      const traceFront = traceFrontRef.current!;
      const traceBack = traceBackRef.current!;

      await animateFrame(CFG.orbitDuration, (p, raw, now) => {
        if (cancelRef.current) return;
        const theta = geom.startTheta + p * Math.PI * 2;
        const pos = ellipsePoint(geom, theta);
        let t = theta % (Math.PI * 2);
        if (t < 0) t += Math.PI * 2;
        const front = t >= 0.11 * Math.PI && t <= 0.92 * Math.PI;
        const scale = 1 + Math.sin(p * Math.PI * 4) * 0.018;
        const rotate = Math.sin(p * Math.PI * 2) * 7;
        setHeart(pos.x, pos.y, scale, rotate, 1);
        heartEl.style.zIndex = front ? '10' : '4';
        heartEl.style.opacity = front ? '1' : '0.96';

        if (now - lastTrail > trailGapScaled && raw > 0.03 && raw < 0.97) {
          lastTrail = now;
          const tangent = geom.startTheta + (p * Math.PI * 2) + Math.PI / 2 + geom.tilt;
          const container = front ? traceFront : traceBack;
          spawnRocketStreak(container, pos.x, pos.y, tangent);
          if (Math.random() > (0.18 + (1 - fxScale) * 0.4)) spawnTrail(container, pos.x, pos.y);
          if (Math.random() > (0.42 + (1 - fxScale) * 0.3)) spawnStar(container, pos.x, pos.y);
        }
      }, easeInOutCubic);
    }

    async function dotPhase(geom: Geom) {
      const heartEl = heartRef.current!;
      const fxLayer = fxLayerRef.current!;
      heartEl.classList.add('miamo-is-dot');
      heartEl.style.zIndex = '10';
      const holdX = geom.startX, holdY = geom.startY;
      setHeart(holdX, holdY, 1, 0, 1);
      burst(fxLayer, holdX, holdY, 6);
      spawnRipple(fxLayer, holdX, holdY);

      await animateFrame(CFG.dotActionDuration, (p, raw, now) => {
        if (cancelRef.current) return;
        const pulse = 1 + Math.sin(p * Math.PI * 3.2) * 0.10;
        const opacity = 0.94 + Math.sin(p * Math.PI * 3.2) * 0.06;
        const tinyRotate = Math.sin(p * Math.PI * 6) * 1.1;
        setHeart(holdX, holdY, pulse, tinyRotate, opacity);
        if (Math.floor(now / 260) % 2 === 0 && raw > 0.14 && raw < 0.90) {
          spawnStar(fxLayer, holdX + (Math.random() - 0.5) * 7, holdY + (Math.random() - 0.5) * 7);
        }
        if (Math.floor(now / 580) % 2 === 0 && raw > 0.20 && raw < 0.84) {
          spawnRipple(fxLayer, holdX, holdY);
        }
      }, easeOutCubic);

      await animateFrame(CFG.holdDuration, () => {
        if (cancelRef.current) return;
        setHeart(holdX, holdY, 1, 0, 1);
      });
      heartEl.classList.remove('miamo-is-dot');
    }

    async function run() {
      while (!cancelRef.current) {
        const stage = stageRef.current;
        const logo = logoRef.current;
        const iStem = iStemRef.current;
        if (!stage || !logo || !iStem) break;
        const geom = buildGeometry(stage, logo, iStem);
        setHeart(geom.startX, geom.startY, 1, 0, 1);
        await orbitPhase(geom);
        if (cancelRef.current) break;
        await dotPhase(geom);
      }
      runningRef.current = false;
    }

    // Initial position
    const geom = buildGeometry(stageRef.current, logoRef.current, iStemRef.current);
    setHeart(geom.startX, geom.startY, 1, 0, 1);
    run();

    return () => {
      cancelRef.current = true;
    };
  }, [animated, height, setHeart]);

  // Non-animated: just render static wordmark with heart as dot
  if (!animated) {
    return (
      <span
        className={`miamo-logo-wrapper ${className}`.trim()}
        style={{
          fontFamily: FONT,
          fontSize: height,
          fontWeight: 600,
          color: '#1A1A1A',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          position: 'relative',
          display: 'inline-block',
          whiteSpace: 'nowrap',
        }}
      >
        <span className="miamo-text" aria-label="miamo">
          {'m'}
          <span className="miamo-i-char" style={{ position: 'relative', display: 'inline-block' }}>
            {'ı'}
            <span
              className="miamo-heart-float"
              style={{
                position: 'absolute',
                top: -(heartSize * 0.2),
                left: '50%',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            >
              <HeartSVG size={heartSize} />
            </span>
          </span>
          {'amo'}
        </span>
      </span>
    );
  }

  return (
    <div
      ref={stageRef}
      className={`miamo-stage ${className}`.trim()}
      style={{
        position: 'relative',
        width: '100%',
        height: Math.round(height * 2.4),
        minHeight: Math.max(120, Math.round(height * 1.8)),
        overflow: 'visible',
        background: 'transparent',
      }}
    >
      {/* Back trail layer (behind text) */}
      <div ref={traceBackRef} className="miamo-trace-back" />

      {/* Logo text */}
      <div className="miamo-logo-wrap">
        <div
          ref={logoRef}
          className="miamo-logo-text"
          style={{
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: height,
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
          aria-label="miamo"
        >
          m<span ref={iStemRef} className="miamo-i-stem">ı</span>amo
        </div>
      </div>

      {/* Front trail layer (in front of text) */}
      <div ref={traceFrontRef} className="miamo-trace-front" />
      {/* FX layer (stars, ripples) */}
      <div ref={fxLayerRef} className="miamo-fx-layer" />

      {/* Heart */}
      <div
        ref={heartRef}
        className="miamo-heart"
        aria-hidden="true"
        style={{ width: heartSize, height: heartSize }}
      >
        <HeartSVG size={heartSize} />
      </div>
    </div>
  );
}

/* ─── HEART SVG — matches the provided design ────────────── */
function HeartSVG({ size = 40 }: { size?: number }) {
  const gradId = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="10%" y1="4%" x2="90%" y2="96%">
          <stop offset="0%" stopColor="#fff6f2" />
          <stop offset="18%" stopColor="#f9e3da" />
          <stop offset="48%" stopColor="#efc3b5" />
          <stop offset="100%" stopColor="#c97763" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M32 56.5c-1.05 0-2.08-.36-2.92-1.09C17.02 44.95 8 37.13 8 25.72 8 16.93 14.82 10 23.43 10c4.47 0 8.52 1.86 11.38 5.26C37.67 11.86 41.72 10 46.19 10 54.8 10 61.62 16.93 61.62 25.72c0 11.41-9.02 19.23-21.08 29.69-.84.73-1.87 1.09-2.92 1.09H32z"
      />
      <path
        fill="rgba(255,255,255,0.68)"
        d="M22.2 16.6c-4.15.92-7.1 4.12-7.64 8.25-.12.95.88 1.64 1.68 1.11 2.94-1.93 6.42-3.51 10.95-4.54 1.16-.26 1.43-1.74.46-2.39-1.45-.97-3.24-1.59-5.45-2.43z"
      />
    </svg>
  );
}

/* ─── EXPORTS FOR COMPATIBILITY ───────────────────────────── */
export function MiamoStaticWordmark({ height = 20, className = '' }: { height?: number; className?: string }) {
  return <MiamoWordmark height={height} className={className} animated={false} />;
}

/* ─── "M" ICON — white curvy card with stylized m ─────────── */
export function MiamoIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF8F5 100%)',
        boxShadow: '0 2px 12px rgba(201,120,86,0.12), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid rgba(201,120,86,0.08)',
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: size * 0.52,
          lineHeight: 1,
          color: 'transparent',
          background: 'linear-gradient(180deg, #5f5f68 0%, #111214 42%, #6a6b73 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
        }}
      >
        m
      </span>
    </div>
  );
}

export function MiamoLogoIcon({ size = 40, className = '' }: { size?: number; className?: string }) {
  return <MiamoIcon size={size} className={className} />;
}

export function AnimatedMiamoLogo({
  size = 36,
  animated = true,
  className = '',
  onClick,
}: {
  size?: number;
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`flex items-center select-none ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <motion.div
        whileHover={animated ? { scale: 1.03 } : undefined}
        whileTap={animated ? { scale: 0.97 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <MiamoWordmark height={Math.round(size * 0.6)} animated={animated} />
      </motion.div>
    </div>
  );
}

export function MiamoCompactIcon({ size = 28, className = '' }: { size?: number; className?: string }) {
  return <MiamoIcon size={size} className={className} />;
}

export function MiamoSplash({ onComplete, duration = 3200 }: { onComplete?: () => void; duration?: number }) {
  const [phase, setPhase] = useState<'show' | 'done'>('show');
  useEffect(() => {
    const t = setTimeout(() => {
      setPhase('done');
      onComplete?.();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {phase === 'show' && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-miamo-bg flex items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center gap-4">
            <MiamoWordmark height={52} animated={true} />
            <motion.p
              className="text-[11px] text-text-muted font-medium tracking-[0.2em] uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              Where hearts connect
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MiamoFavicon({ size = 32 }: { size?: number }) {
  return <MiamoIcon size={size} />;
}

export function MiamoLoader({ size = 56, text, className = '' }: { size?: number; text?: string; className?: string }) {
  return (
    <div className={`flex flex-1 items-center justify-center ${className}`} style={{ minHeight: '60vh' }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
        <MiamoWordmark height={Math.round(size * 0.45)} animated={true} />
        {text && (
          <motion.p
            className="text-[13px] text-text-muted"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {text}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export function MiamoLogo({ size = 32, animated = true, className = '' }: { size?: number; animated?: boolean; className?: string }) {
  return <AnimatedMiamoLogo size={size} animated={animated} className={className} />;
}
