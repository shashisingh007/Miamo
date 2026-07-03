/**
 * Phase 19 — viewport class helper (UI sweep 320..2560px).
 *
 * Bins a pixel width into a stable class label. Used by:
 *   - tracking SDK to tag every `page.view`/`nav.route` with `vw_class`
 *   - layout components to pick the right grid template
 *   - QA scripts to ensure every screen is tested in each bin
 *
 * Bins are inclusive-low, exclusive-high:
 *   xs   <  480  (small phones)
 *   sm   <  640
 *   md   <  960  (tablet portrait)
 *   lg   < 1280  (laptop)
 *   xl   < 1600
 *   xxl  < 2048
 *   xxxl >=2048  (ultrawide / 4K)
 */
export type ViewportClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

export const VIEWPORT_BREAKS: ReadonlyArray<{ max: number; cls: ViewportClass }> = [
  { max: 480,  cls: 'xs' },
  { max: 640,  cls: 'sm' },
  { max: 960,  cls: 'md' },
  { max: 1280, cls: 'lg' },
  { max: 1600, cls: 'xl' },
  { max: 2048, cls: 'xxl' },
  { max: Infinity, cls: 'xxxl' },
];

/** Canonical QA matrix — every screen must be visually inspected at these. */
export const QA_WIDTHS: ReadonlyArray<number> = [320, 360, 414, 480, 768, 1024, 1280, 1440, 1920, 2560];

export function viewportClass(widthPx: number | null | undefined): ViewportClass {
  if (widthPx == null || !Number.isFinite(widthPx) || widthPx < 0) return 'xs';
  for (const { max, cls } of VIEWPORT_BREAKS) {
    if (widthPx < max) return cls;
  }
  return 'xxxl';
}

/** Inverse: minimum pixel width covered by a class. */
export function classMinWidth(cls: ViewportClass): number {
  if (cls === 'xs') return 0;
  const idx = VIEWPORT_BREAKS.findIndex((b) => b.cls === cls);
  return idx <= 0 ? 0 : VIEWPORT_BREAKS[idx - 1].max;
}

/** Returns the QA matrix widths that fall inside the given class. */
export function qaWidthsForClass(cls: ViewportClass): number[] {
  return QA_WIDTHS.filter((w) => viewportClass(w) === cls);
}
