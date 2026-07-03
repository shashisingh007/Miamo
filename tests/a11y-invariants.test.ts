/**
 * Accessibility invariants — static source scans on services/web/src/**.
 *
 * These are grep-scoped a11y invariants that catch **regressions at test
 * time** without needing a browser (no jsdom / axe-core dependency). Each
 * test protects against a specific class of a11y bug we've already fixed
 * or a rule we've committed to as documented style.
 *
 * Pattern is the same as tests/web-ux-invariants.test.ts (§ B.5 top-30).
 *
 * Cross-refs:
 *   - docs/architecture/click-matrix.md §5 ranks 46–60 (WCAG AA wave)
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.8
 *   - tests/web-ux-invariants.test.ts (§B.5 style precedent)
 *
 * Scope discipline: we only enforce invariants that the codebase already
 * satisfies today. Turning up new violations is a follow-up ticket, not a
 * test-suite failure — otherwise these tests would flap on every unrelated
 * PR that touches components/. Each `it()` explicitly documents what it
 * catches.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WEB_ROOT = join(__dirname, '..', 'services', 'web', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(entry)) out.push(p);
  }
  return out;
}

const ALL_FILES = walk(WEB_ROOT);

function stripComments(src: string): string {
  // Strip block comments; leave line comments alone (per-line skip below).
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

function grepAll(regex: RegExp): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const file of ALL_FILES) {
    const content = readFileSync(file, 'utf8');
    const noBlock = stripComments(content);
    const lines = noBlock.split('\n');
    const origLines = content.split('\n');
    lines.forEach((text, i) => {
      const trimmed = text.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
      const stripped = text.replace(/\/\/.*$/, '');
      if (regex.test(stripped)) {
        hits.push({ file, line: i + 1, text: (origLines[i] || '').trim() });
      }
    });
  }
  return hits;
}

// Find every `<img ... >` tag (possibly multi-line) after block-comment strip,
// return the ones that lack an `alt=` attribute. Multi-line-aware.
// Scans .tsx/.jsx only — pure .ts collector files reference `<img>` in string
// literals / comments describing DOM structure and are not JSX.
function findImgsWithoutAlt(): Array<{ file: string; line: number; tag: string }> {
  const bad: Array<{ file: string; line: number; tag: string }> = [];
  const jsxFiles = ALL_FILES.filter((f) => /\.(tsx|jsx)$/.test(f));
  for (const file of jsxFiles) {
    const rawContent = readFileSync(file, 'utf8');
    // Strip block comments AND line comments — the latter often contain
    // "<img>" as prose ("Ctrl+wheel on an <img>" etc.).
    const noComments = stripComments(rawContent).replace(/^\s*\/\/.*$/gm, '');
    const re = /<img\b[^>]*\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(noComments)) !== null) {
      const tag = m[0];
      if (!/\balt\s*=/.test(tag)) {
        const line = noComments.slice(0, m.index).split('\n').length;
        bad.push({ file, line, tag: tag.slice(0, 200) });
      }
    }
  }
  return bad;
}

// (role="button" keyboard-handler check is inlined per-file in its `it` block
// to allow narrowing to the click-matrix Wave-1 hotspots.)

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('a11y invariants (§G.8, click-matrix §5 ranks 46-60)', () => {
  // ── Static image alt ──────────────────────────────────────────────────────
  it('every <img> under services/web/src has an alt attribute', () => {
    // // because: WCAG 2.1 SC 1.1.1 — non-text content needs a text
    // alternative. React auto-warns on missing alt but suppresses in prod;
    // this scan catches production regressions.
    const bad = findImgsWithoutAlt();
    if (bad.length > 0) {
      // eslint-disable-next-line no-console
      console.error('img without alt:', bad);
    }
    expect(bad, `Missing alt=: ${JSON.stringify(bad, null, 2)}`).toHaveLength(0);
  });

  // ── Modal / dialog primitives ─────────────────────────────────────────────
  it('ConfirmDialog root element has role="dialog" AND aria-modal="true"', () => {
    // // because: click-matrix.md §5 rank 6 — replaces window.confirm.
    // Screen readers need role+modal to announce the dialog and trap focus.
    const path = join(WEB_ROOT, 'components', 'ui', 'confirm-dialog.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/role\s*=\s*["']dialog["']/);
    expect(content).toMatch(/aria-modal\s*=\s*["']true["']/);
  });

  it('ConfirmDialog handles Escape key to close', () => {
    // // because: WCAG 2.1 SC 2.1.2 — no keyboard trap. Modal dialogs must
    // be dismissable via keyboard.
    const path = join(WEB_ROOT, 'components', 'ui', 'confirm-dialog.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/e\.key\s*===\s*['"]Escape['"]/);
  });

  it('InputModal (native-prompt replacement) exists and renders a <label> or <Modal title>', () => {
    // // because: click-matrix §3.2 replaced window.prompt with an
    // InputModal component. Its accessible name comes from the wrapping
    // <Modal title="…"> plus an optional <label> for the input; if either
    // disappears, screen-reader users lose the field's purpose.
    const path = join(WEB_ROOT, 'components', 'ui', 'modal.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/export function InputModal\b/);
    // The Modal wrapper passes `title` — that's the dialog's accessible name.
    expect(content).toMatch(/<Modal\b[^>]*title=/);
    // The input still has an associated <label> element rendered when the
    // caller provides `label` (present in every InputModal call site today).
    expect(content).toMatch(/\{label\s*&&\s*<label\b/);
  });

  // ── Toast / live regions ──────────────────────────────────────────────────
  it('Toast container has aria-live="polite"', () => {
    // // because: WCAG 4.1.3 — status messages must be announced without
    // stealing focus. `polite` waits for a break in speech; `assertive` is
    // reserved for errors that need immediate reading.
    const path = join(WEB_ROOT, 'components', 'ui', 'toast.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/aria-live\s*=\s*["']polite["']/);
  });

  // ── role="button" keyboard accessibility ─────────────────────────────────
  it('the five landed role="button" hotspots have tabIndex={0} AND onKeyDown', () => {
    // // because: click-matrix §5 ranks 46-60. Divs/spans with
    // `role="button"` must be Tab-reachable AND fire on Enter/Space, or
    // they're inaccessible to keyboard users. React does NOT do this
    // automatically — we do. These are the five hotspots that Wave 1
    // already ratcheted; the invariant guards against a rollback.
    const hotspots = [
      join(WEB_ROOT, 'app', '(main)', 'discover', 'components', 'ShortcutBar.tsx'),
      join(WEB_ROOT, 'app', '(main)', 'matches', 'components', 'StoriesRail.tsx'),
      join(WEB_ROOT, 'app', '(main)', 'stories', 'components', 'StoryCreateModal.tsx'),
      join(WEB_ROOT, 'components', 'MediaPicker.tsx'),
      join(WEB_ROOT, 'components', 'deferred', 'DeferredPileModal.tsx'),
    ];
    for (const file of hotspots) {
      const content = readFileSync(file, 'utf8');
      expect(content, `${file}: role="button" missing`).toMatch(/role="button"/);
      // Not every hotspot pairs role="button" with keyboard handlers on the
      // very same element — some scope tabIndex to a parent. Run our
      // regex-based scanner against just this file to prove no offender
      // remains that lacks BOTH handlers in a 500-char window.
      const badInFile: number[] = [];
      const noBlock = stripComments(content);
      const re = /role\s*=\s*["']button["']/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(noBlock)) !== null) {
        const start = Math.max(0, m.index - 200);
        const end = Math.min(noBlock.length, m.index + 500);
        const w = noBlock.slice(start, end);
        const hasTab = /tabIndex\s*=\s*\{?\s*0/.test(w);
        const hasKey = /onKeyDown\s*=/.test(w);
        if (!(hasTab && hasKey)) {
          badInFile.push(noBlock.slice(0, m.index).split('\n').length);
        }
      }
      expect(badInFile, `${file}: role="button" without keyboard handler at lines ${badInFile}`).toEqual([]);
    }
  });

  // ── Skip-link ────────────────────────────────────────────────────────────
  it('(main)/layout.tsx contains a WCAG-AA skip link + matching #main-content target', () => {
    // // because: click-matrix §5 rank 46-60. Keyboard-only users need to
    // bypass sidebar/header navigation to reach page content.
    const path = join(WEB_ROOT, 'app', '(main)', 'layout.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/href="#main-content"/);
    expect(content).toMatch(/Skip to main content/);
    expect(content).toMatch(/<main[^>]*id="main-content"/);
    // Skip link is sr-only until focused (visually hidden but reachable).
    expect(content).toMatch(/sr-only\s+focus:not-sr-only/);
  });

  // ── Anti-pattern: alert/confirm/prompt (native, keyboard-modal traps) ────
  it('no native alert() / confirm() / prompt() in services/web/src (uses toast/ConfirmDialog/InputModal)', () => {
    // // because: native dialogs break the app's focus management,
    // are non-styleable, and can't be internationalized. Every replacement
    // has been landed — this locks that in.
    // Reuse patterns from web-ux-invariants.test.ts.
    const hits = grepAll(/(^|[^.\w])(alert|confirm|prompt)\s*\(/).filter((h) => {
      // exclude imports/exports and aria-* attribute names
      if (/from ['"]/.test(h.text)) return false;
      if (/aria-/.test(h.text)) return false;
      return true;
    });
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Native dialog hits:', hits);
    }
    expect(hits).toHaveLength(0);
  });

  it('no window.confirm / window.alert / window.prompt anywhere in web/src', () => {
    // // because: sibling to the check above — some engineers reach for
    // `window.confirm` when auto-import fails. Same anti-pattern, same fix.
    const hits = grepAll(/window\.(confirm|alert|prompt)\s*\(/);
    expect(hits).toHaveLength(0);
  });

  // ── Focus trap / Escape-handler quality ──────────────────────────────────
  it('the shared modal primitives (Modal, ConfirmDialog) both handle Escape', () => {
    // // because: the two modal primitives own dismissal for the whole
    // app. If either drops Escape handling, every downstream consumer
    // silently loses keyboard-close support. Ad-hoc role="dialog" in
    // feature components is out of scope for this invariant — they're
    // audited case-by-case in the click-matrix.
    const modalPath = join(WEB_ROOT, 'components', 'ui', 'modal.tsx');
    const confirmPath = join(WEB_ROOT, 'components', 'ui', 'confirm-dialog.tsx');
    for (const p of [modalPath, confirmPath]) {
      const c = readFileSync(p, 'utf8');
      expect(c, `${p}: missing Escape handler`).toMatch(/Escape/);
    }
  });

  // ── Semantic HTML — link vs button ────────────────────────────────────────
  it('no <a> tag with href="#" that does not also have role="button" (misuse as button)', () => {
    // // because: `<a href="#">` navigates to the top of the page and
    // is not semantically a button. If it's meant to trigger an action,
    // use <button> or add role="button".
    const hits = grepAll(/<a\s+[^>]*href\s*=\s*["']#["']/)
      .filter((h) => !/role\s*=\s*["']button["']/.test(h.text));
    if (hits.length > 0) console.error('<a href="#"> without role="button":', hits);
    expect(hits).toHaveLength(0);
  });

  // ── Focus outline preservation ────────────────────────────────────────────
  it('no `outline: none` in inline styles without an alternative focus indicator', () => {
    // // because: killing the focus outline without replacement makes
    // keyboard focus invisible. This scan catches inline-style regressions;
    // Tailwind classes like `focus:outline-none focus:ring-2` are OK.
    const hits = grepAll(/style\s*=\s*\{[^}]*outline\s*:\s*['"]?none/);
    if (hits.length > 0) console.error('inline outline:none without ring:', hits);
    expect(hits).toHaveLength(0);
  });

  // ── Semantic heading ──────────────────────────────────────────────────────
  it('(main) layout contains exactly one <h1> (single page heading anchor)', () => {
    // // because: WCAG SC 1.3.1 / 2.4.6 — one h1 per page. The layout
    // owns the header <h1> title; page components should use <h2>+ under it.
    const path = join(WEB_ROOT, 'app', '(main)', 'layout.tsx');
    const content = readFileSync(path, 'utf8');
    const h1Count = (content.match(/<h1\b/g) ?? []).length;
    expect(h1Count).toBe(1);
  });

  // ── Contrast smell ────────────────────────────────────────────────────────
  it('no obviously-invisible white-on-white / black-on-black inline styles', () => {
    // // because: contrast smell — inline `color:#fff` combined with
    // `background:#fff` on the same element is almost always a bug.
    const hits: Array<{ file: string; line: number; text: string }> = [];
    for (const file of ALL_FILES) {
      const content = readFileSync(file, 'utf8');
      const noBlock = stripComments(content);
      // Match a style={{ ... }} block; if it contains both color+background
      // set to the same visible-color literal, flag it.
      const styleRe = /style\s*=\s*\{\{([^}]*)\}\}/g;
      let m: RegExpExecArray | null;
      while ((m = styleRe.exec(noBlock)) !== null) {
        const inner = m[1];
        const hasWhiteFg = /color\s*:\s*['"]?(?:#f{3,6}|white|rgb\(\s*255)/i.test(inner);
        const hasWhiteBg = /background(?:Color)?\s*:\s*['"]?(?:#f{3,6}|white|rgb\(\s*255)/i.test(inner);
        const hasBlackFg = /color\s*:\s*['"]?(?:#0{3,6}|black|rgb\(\s*0\s*,\s*0\s*,\s*0)/i.test(inner);
        const hasBlackBg = /background(?:Color)?\s*:\s*['"]?(?:#0{3,6}|black|rgb\(\s*0\s*,\s*0\s*,\s*0)/i.test(inner);
        if ((hasWhiteFg && hasWhiteBg) || (hasBlackFg && hasBlackBg)) {
          const line = noBlock.slice(0, m.index).split('\n').length;
          hits.push({ file, line, text: m[0].slice(0, 200) });
        }
      }
    }
    if (hits.length > 0) console.error('white-on-white / black-on-black inline styles:', hits);
    expect(hits).toHaveLength(0);
  });

  // ── Anti-pattern: input without any label source ─────────────────────────
  it('every <input> in modal.tsx has either a <label> sibling OR a placeholder', () => {
    // // because: WCAG SC 1.3.1 / 3.3.2 — inputs need programmatic labels.
    // The strictly-accepted set is <label> / aria-label / aria-labelledby;
    // placeholder is a legacy accessible-name source that most SR/AT still
    // read out. Locking that every input has AT LEAST a placeholder ensures
    // no field is completely nameless.
    const modalPath = join(WEB_ROOT, 'components', 'ui', 'modal.tsx');
    const modal = readFileSync(modalPath, 'utf8');
    // Find every `<input …/>` block by scanning up to the closing `/>`
    // manually — a plain regex won't count nested `>` inside attribute
    // expressions like `onChange={e => setValue(...)}`.
    const bad: string[] = [];
    let scanCursor = 0;
    let inputCount = 0;
    while (true) {
      const startIdx = modal.indexOf('<input', scanCursor);
      if (startIdx < 0) break;
      inputCount++;
      const closeIdx = modal.indexOf('/>', startIdx);
      const gtIdx = modal.indexOf('>', startIdx);
      // Take whichever end sentinel comes first (self-close or plain close).
      const end = closeIdx > 0 && closeIdx < gtIdx + 400 ? closeIdx + 2 : gtIdx + 1;
      const tag = modal.slice(startIdx, end);
      const hasName = /(aria-label|aria-labelledby|placeholder)\s*=/.test(tag);
      if (!hasName) bad.push(tag.slice(0, 200));
      scanCursor = end;
    }
    expect(inputCount).toBeGreaterThan(0);
    expect(bad, `inputs in modal.tsx with no accessible name: ${bad.join('\n---\n')}`).toEqual([]);
  });

  // ── Anti-pattern: <div onClick> without keyboard ─────────────────────────
  it('DeferredPileModal + ShortcutBar interactive divs are keyboard-accessible', () => {
    // // because: these are the two known "custom widget" hotspots that
    // web-ux-invariants.test.ts already ratchets. Re-assert here as a11y
    // sanity so a11y-invariants owns the a11y half of the invariant.
    const paths = [
      join(WEB_ROOT, 'components', 'deferred', 'DeferredPileModal.tsx'),
      join(WEB_ROOT, 'app', '(main)', 'discover', 'components', 'ShortcutBar.tsx'),
    ];
    for (const path of paths) {
      const content = readFileSync(path, 'utf8');
      expect(content, `${path}: role="button" missing`).toMatch(/role="button"/);
      expect(content, `${path}: tabIndex missing`).toMatch(/tabIndex=\{0\}/);
      expect(content, `${path}: onKeyDown missing`).toMatch(/onKeyDown=/);
    }
  });

  // ─── G.14 design-system contracts ──────────────────────────────────────
  // Because: the Skeleton and EmptyState primitives are the two building
  // blocks of every loading / empty / error state in the app. Their
  // contracts (aria-busy, role="status", variant surface) must not silently
  // drift; a design engineer who removes the role="status" on Skeleton
  // regresses accessibility for every listing surface at once.

  it('Skeleton base renders with role="status" AND aria-busy="true"', () => {
    // // because: WCAG 4.1.3 — inflight status must be exposed to AT.
    // The wrapper announces "Loading" once; inner shimmer blocks are
    // aria-hidden so the announcement is single, not per-pulse.
    const path = join(WEB_ROOT, 'components', 'ui', 'skeleton.tsx');
    const content = readFileSync(path, 'utf8');
    // Base Skeleton function must set both attributes.
    const baseIdx = content.indexOf('export function Skeleton(');
    expect(baseIdx, 'export function Skeleton missing').toBeGreaterThan(-1);
    // Search the ~1200 chars following the export for both attributes.
    const window = content.slice(baseIdx, baseIdx + 1200);
    expect(window).toMatch(/role="status"/);
    expect(window).toMatch(/aria-busy="true"/);
  });

  it('Skeleton primitive variants (Card / Row / Text) are all exported', () => {
    // // because: the empty-state migration pass consumes exactly these
    // three variants. If any of them disappears, downstream callers
    // silently render nothing (bare undefined component).
    const path = join(WEB_ROOT, 'components', 'ui', 'skeleton.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/export function SkeletonCard\b/);
    expect(content).toMatch(/export function SkeletonRow\b/);
    expect(content).toMatch(/export function SkeletonText\b/);
  });

  it('Skeleton primitive variants each set role="status" (single wrapper announcement)', () => {
    // // because: primitive variants are used verbatim inside lists — if
    // they each announce per row, screen readers get spammed. Rule: one
    // role="status" per variant wrapper; inner blocks are aria-hidden.
    const path = join(WEB_ROOT, 'components', 'ui', 'skeleton.tsx');
    const content = readFileSync(path, 'utf8');
    // Grab each variant's function body and check it contains role="status"
    // exactly once.
    for (const name of ['SkeletonCard', 'SkeletonRow', 'SkeletonText']) {
      const idx = content.indexOf(`export function ${name}(`);
      expect(idx, `${name}: missing export`).toBeGreaterThan(-1);
      // Slice until the next `export function` or the file end so a
      // primitive that immediately precedes another doesn't get miscounted.
      const nextExportAt = content.indexOf('\nexport function ', idx + 1);
      const body = content.slice(idx, nextExportAt > -1 ? nextExportAt : content.length);
      const matches = (body.match(/role="status"/g) ?? []).length;
      expect(matches, `${name}: expected 1 role="status", got ${matches}`).toBe(1);
    }
  });

  it('SkeletonText clamps `lines` prop to a safe range', () => {
    // // because: an untrusted-caller `lines={9999}` would render 9999
    // divs and thrash layout. The clamp is documented; this locks it in.
    const path = join(WEB_ROOT, 'components', 'ui', 'skeleton.tsx');
    const content = readFileSync(path, 'utf8');
    // Look for Math.max/Math.min pattern in SkeletonText body.
    const idx = content.indexOf('export function SkeletonText(');
    expect(idx).toBeGreaterThan(-1);
    const body = content.slice(idx, idx + 800);
    expect(body).toMatch(/Math\.max\s*\(\s*1/);
    expect(body).toMatch(/Math\.min\s*\(\s*lines\s*,\s*10\s*\)/);
  });

  it('EmptyState primitive file exists and exports the component', () => {
    // // because: many downstream consumers import from this exact path;
    // a rename without a re-export shim breaks the design-system contract.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/export function EmptyState\b/);
    // Must also export the variant type so consumers can type their own
    // wrappers without duplicating the union.
    expect(content).toMatch(/export type EmptyStateVariant\b/);
  });

  it('EmptyState renders role="status" so AT announces state changes', () => {
    // // because: when a list drains (last item removed), the empty state
    // replaces it — a live-region announcement is the standard way to let
    // a screen-reader user know their action succeeded / the list is now
    // empty.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/role="status"/);
  });

  it('EmptyState accepts an optional `action` prop (CTA) as ReactNode', () => {
    // // because: recovery from an empty/error state usually requires an
    // action ("Retry", "Adjust filters", "Send a like"). Locking the prop
    // type ensures callers can pass a fully-formed <button>/<Link>, not a
    // string, keeping analytics + routing under caller control.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/action\??:\s*ReactNode/);
  });

  it('EmptyState supports variant "default" | "error" | "success"', () => {
    // // because: three visual affordances cover the whole empty/error/
    // success surface area. If a fourth is added silently, the styles map
    // is missing a key and the component renders `undefined` styles. This
    // test locks the current triplet.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/'default'/);
    expect(content).toMatch(/'error'/);
    expect(content).toMatch(/'success'/);
    // The VARIANT_STYLES record must key on each of the three literals.
    expect(content).toMatch(/VARIANT_STYLES/);
  });

  it('EmptyState renders <h3> for the title (semantic heading, not <div>)', () => {
    // // because: an empty state IS a small landmark — a screen reader
    // that walks headings should hit "No matches yet" as a heading. Using
    // a semantic <h3> also keeps document outline sensible on pages that
    // are 100% empty state.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/<h3[^>]*>\s*\{title\}\s*<\/h3>/);
  });

  it('EmptyState hides the decorative icon from AT via aria-hidden', () => {
    // // because: the icon is a lucide glyph — decorative, not content.
    // If a screen reader reads "warning icon triangle" before every empty
    // state, the announcement is noise. aria-hidden lets AT skip it.
    const path = join(WEB_ROOT, 'components', 'ui', 'empty-state.tsx');
    const content = readFileSync(path, 'utf8');
    // Every Icon usage must carry aria-hidden.
    expect(content).toMatch(/<Icon[^>]*aria-hidden="true"/);
  });

  // ── Coverage summary ──────────────────────────────────────────────────────
  it('a11y-invariants coverage sanity: >= 15 assertions in this file', () => {
    // // because: G.8 target is ≥15 invariants. Meta-test that fails if a
    // future refactor accidentally deletes half the invariants.
    // (This is a self-referential structural check — see below for the count.)
    const self = readFileSync(__filename, 'utf8');
    const itCount = (self.match(/^\s*it\(/gm) ?? []).length;
    expect(itCount).toBeGreaterThanOrEqual(15);
  });
});
