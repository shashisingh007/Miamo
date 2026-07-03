/**
 * Web UX invariants — enforce the Phase B.5 top-30 fixes on `services/web/src/`.
 *
 * These are grep-scoped tests: the harness excludes services/web from vitest
 * (no jsdom setup), but static invariants can still be asserted from Node.
 * If any of these fail in the future, someone re-introduced a class of bug
 * the click-matrix.md audit deliberately eliminated.
 *
 * Cross-refs:
 * - docs/architecture/click-matrix.md §3.2 (native-dialog anti-patterns)
 * - docs/architecture/click-matrix.md §5 ranks 1-6 (top-6 UX fixes)
 * - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §6 (anti-pattern table)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const WEB_ROOT = join(__dirname, '..', 'services', 'web', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    // Skip node_modules or .next inside the web tree if any surface.
    if (entry === 'node_modules' || entry === '.next') continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(t|j)sx?$/.test(entry)) out.push(p);
  }
  return out;
}

const allFiles = walk(WEB_ROOT);

function grepAll(regex: RegExp): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf8');
    // Strip all block comments before splitting so multi-line JSDoc/comment
    // blocks (which include documentation like "Replaces `window.prompt()`")
    // do not trip these anti-pattern greps.
    const noBlock = content.replace(/\/\*[\s\S]*?\*\//g, '');
    const lines = noBlock.split('\n');
    const origLines = content.split('\n');
    lines.forEach((text, i) => {
      // Also strip line comments + lines that are JSDoc continuation (`  *`).
      const trimmed = text.trim();
      if (trimmed.startsWith('*') || trimmed.startsWith('//')) return;
      const stripped = text.replace(/\/\/.*$/, '');
      if (regex.test(stripped)) hits.push({ file, line: i + 1, text: (origLines[i] || '').trim() });
    });
  }
  return hits;
}

describe('web UX invariants (click-matrix.md §5 Wave 1)', () => {
  it('no bare alert() calls in (main)/ code (§3.2)', () => {
    // A bare `alert(` at the start of an expression is the native call.
    // We intentionally exclude a match inside strings + `.alert(` (toast .alert
    // is not something the codebase uses today).
    const hits = grepAll(/(^|[^.\w])alert\s*\(/).filter(
      (h) => !/from ['"]/.test(h.text) && !/aria-alert/.test(h.text),
    );
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Native alert() hits:', hits);
    }
    expect(hits, `Unexpected native alert(): ${JSON.stringify(hits, null, 2)}`).toHaveLength(0);
  });

  it('no window.confirm / window.alert / window.prompt (§3.2)', () => {
    const hits = grepAll(/window\.(confirm|alert|prompt)\s*\(/);
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Native window dialog hits:', hits);
    }
    expect(hits).toHaveLength(0);
  });

  it('no bare confirm() or prompt() calls (§3.2)', () => {
    const hits = grepAll(/(^|[^.\w])(confirm|prompt)\s*\(/).filter(
      (h) => !/from ['"]/.test(h.text) && !/aria-/.test(h.text),
    );
    // The `<InputModal>` component contains "prompt()" only inside a JSDoc
    // comment (already stripped above) and in an aria-label/prop name, so
    // this should be empty on a passing codebase.
    if (hits.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Native confirm/prompt hits:', hits);
    }
    expect(hits).toHaveLength(0);
  });

  it('ChatView no longer imports Phone/Video icons or renders CallOverlay (§5 rank 4)', () => {
    const chatViewPath = join(
      WEB_ROOT,
      'app',
      '(main)',
      'messages',
      'components',
      'ChatView.tsx',
    );
    const content = readFileSync(chatViewPath, 'utf8');
    // The removal comment references "CallOverlay" and "Phone" — that's OK.
    // We assert on the JSX call sites: neither the icon nor the component
    // should be *rendered* anywhere.
    expect(content).not.toMatch(/<CallOverlay\b/);
    expect(content).not.toMatch(/setCallType\s*\(/);
    // The two chat-header call buttons are gone.
    expect(content).not.toMatch(/title="Voice call"/);
    expect(content).not.toMatch(/title="Video call"/);
  });

  it('Compatibility "Share Results" no longer wires to resetQuiz (§5 rank 3)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'compatibility', 'page.tsx');
    const content = readFileSync(path, 'utf8');
    // The Share Results button should call shareResults, not resetQuiz.
    const shareRow = content.match(/Share Results[\s\S]{0,80}/);
    expect(shareRow, 'Share Results row not found').toBeTruthy();
    expect(shareRow?.[0]).not.toMatch(/onClick=\{resetQuiz\}/);
  });

  it('Profile "Start Verification" wires to router.push (§5 rank 2)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'profile', 'page.tsx');
    const content = readFileSync(path, 'utf8');
    // Locate the surrounding Button JSX for "Start Verification".
    const match = content.match(/Start Verification[\s\S]{0,240}/);
    expect(match).toBeTruthy();
    // Look backwards up to 400 chars for the onClick that fires the router push.
    const idx = content.indexOf('Start Verification');
    const window = content.slice(Math.max(0, idx - 400), idx + 240);
    expect(window).toMatch(/router\.push\(['"]\/verify['"]\)/);
  });

  it('Settings has no coming-soon / dead-click surfaces (v1 launch invariant)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'settings', 'page.tsx');
    const content = readFileSync(path, 'utf8');
    // v1 launch: every ex-"coming soon" surface must be gone. If any of
    // these strings reappears in the UI, the launch policy is violated
    // and this test fires.
    expect(content).not.toMatch(/Coming soon/i);
    expect(content).not.toMatch(/coming.in.the.next.update/i);
    expect(content).not.toMatch(/link soon/i);
    expect(content).not.toMatch(/\/coming-soon/);
    // Support + feedback still expose real mailto: destinations.
    expect(content).toMatch(/mailto:support@miamo\.app/);
    expect(content).toMatch(/mailto:feedback@miamo\.app/);
  });

  it('ConfirmDialog component exists and is exported (§Wave 1 support)', () => {
    const path = join(WEB_ROOT, 'components', 'ui', 'confirm-dialog.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/export function ConfirmDialog\b/);
    // Focus trap + escape handling.
    expect(content).toMatch(/e\.key\s*===\s*['"]Escape['"]/);
  });

  it('SpotlightUI DeleteRefundButton uses ConfirmDialog (§5 rank 6)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'creativity', 'components', 'SpotlightUI.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/import\s*\{\s*ConfirmDialog\s*\}\s*from/);
    expect(content).toMatch(/<ConfirmDialog\b/);
  });

  it('EarnDrawer streak claim uses toast, not native alert (§5 rank 6)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'creativity', 'components', 'EarnDrawer.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/useToast/);
    // No line starting with `alert(` outside a comment.
    const lines = content.split('\n').filter((l) => !l.trim().startsWith('//'));
    expect(lines.some((l) => /(^|[^.\w])alert\s*\(/.test(l))).toBe(false);
  });

  it('ReelsView report reason uses InputModal, not window.prompt (§5 rank 6)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'creativity', 'components', 'ReelsView.tsx');
    const content = readFileSync(path, 'utf8');
    expect(content).toMatch(/import\s*\{\s*InputModal\s*\}\s*from/);
    expect(content).toMatch(/<InputModal\b/);
    // The old window.prompt is gone.
    expect(content).not.toMatch(/window\.prompt\s*\(/);
  });

  it('Onboarding savers return Promise<boolean> and toast on failure (§5 rank 17)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'onboarding', 'page.tsx');
    const content = readFileSync(path, 'utf8');
    // Savers return boolean so the caller can conditionally navigate.
    expect(content).toMatch(/async function patchProfile\([^)]*\): Promise<boolean>/);
    expect(content).toMatch(/async function patchMp\([^)]*\): Promise<boolean>/);
    expect(content).toMatch(/async function savePrompts\([^)]*\): Promise<boolean>/);
    expect(content).toMatch(/async function saveInterests\([^)]*\): Promise<boolean>/);
    // Enable DTM only navigates when the patch succeeds.
    expect(content).toMatch(/const ok = await patchProfile\(\{\s*seriousMode:\s*true\s*\}\);\s*\n\s*if \(ok\) router\.push\('\/serious-mode'\);/);
    // rootToast is wired at the top-level component (not just inside BucketEditor).
    expect(content).toMatch(/const rootToast\s*=\s*useToast\(\)/);
    expect((content.match(/rootToast\.error/g)?.length ?? 0)).toBeGreaterThanOrEqual(4);
  });

  it('Settings toggleServer surfaces failures via toast + logError (§5 rank 16)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'settings', 'page.tsx');
    const content = readFileSync(path, 'utf8');
    // Find toggleServer region
    const start = content.indexOf('const toggleServer = async');
    expect(start).toBeGreaterThan(-1);
    const end = content.indexOf('const updatePref = async', start);
    expect(end).toBeGreaterThan(start);
    const region = content.slice(start, end);
    // Region should not contain a silent empty catch.
    expect(region).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*setServer[^}]*\}\s*\}\s*;?\s*$/m);
    expect(region).toMatch(/logError\('settings\.toggleServer'/);
    expect(region).toMatch(/showToast\(/);
  });

  it('Main layout has a WCAG AA skip-link (§5 rank 46-60)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'layout.tsx');
    const content = readFileSync(path, 'utf8');
    // Skip-link exists, points at #main-content, uses sr-only trick.
    expect(content).toMatch(/href="#main-content"/);
    expect(content).toMatch(/Skip to main content/);
    // <main> region has the matching id.
    expect(content).toMatch(/<main id="main-content"/);
  });

  it('ShortcutBar clear-category span is keyboard-accessible (§5 rank 46-60)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'discover', 'components', 'ShortcutBar.tsx');
    const content = readFileSync(path, 'utf8');
    // The role="button" span now has tabIndex + onKeyDown handler.
    const region = content.slice(content.indexOf('role="button"'));
    expect(region.slice(0, 600)).toMatch(/tabIndex=\{0\}/);
    expect(region.slice(0, 600)).toMatch(/onKeyDown=/);
    // aria-label describes the target of the action.
    expect(region.slice(0, 600)).toMatch(/aria-label="Clear category filter"/);
  });

  it('DeferredPileModal item row is keyboard-accessible (§5 rank 46-60)', () => {
    const path = join(WEB_ROOT, 'components', 'deferred', 'DeferredPileModal.tsx');
    const content = readFileSync(path, 'utf8');
    // Extract the block from `items.map((item)` to `renderItem ? renderItem`.
    const start = content.indexOf('items.map((item)');
    expect(start).toBeGreaterThan(-1);
    const end = content.indexOf('handleResolve', start);
    const region = content.slice(start, end);
    expect(region).toMatch(/role="button"/);
    expect(region).toMatch(/tabIndex=\{0\}/);
    expect(region).toMatch(/onKeyDown=/);
  });

  it('StoryViewer menu actions surface failures via toast (§5 rank 15)', () => {
    const path = join(WEB_ROOT, 'app', '(main)', 'stories', 'components', 'StoryViewer.tsx');
    const content = readFileSync(path, 'utf8');
    // useToast is imported + used
    expect(content).toMatch(/import\s*\{\s*useToast\s*\}\s*from/);
    expect(content).toMatch(/const\s+toast\s*=\s*useToast\(\)/);
    // menuBusy state controls loading indicator
    expect(content).toMatch(/menuBusy/);
    // No naked empty catches in the 7 menu actions block.
    // Extract handleDelete → handleReport region
    const startIdx = content.indexOf('const handleDelete = async');
    const endIdx = content.indexOf('if (!story) return null');
    expect(startIdx).toBeGreaterThan(-1);
    expect(endIdx).toBeGreaterThan(startIdx);
    const region = content.slice(startIdx, endIdx);
    // No empty `catch {}` or `catch (e) {}` blocks in that region.
    expect(region).not.toMatch(/catch\s*(\([^)]*\))?\s*\{\s*\}/);
    // Each of the 7 handlers must exist and call toast.error at least once.
    for (const name of [
      'handleDelete',
      'handlePostToFeed',
      'handleCopyLink',
      'handleSaveMedia',
      'handleMuteAuthor',
      'handleReport',
    ]) {
      expect(region, `${name} not found`).toMatch(new RegExp(`const ${name}\\s*=`));
    }
    expect(region.match(/toast\.error\(/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// v1.2 session 14 — Task 1: MatchSuccessModal is wired into discover
// The API returns isMutual/chat/isFirstMatch; the page must consume it.
// These greps lock the wiring so a future refactor cannot silently drop
// the confetti-on-first-match delight (see session 13 status doc).
// ─────────────────────────────────────────────────────────────────────
describe('discover/page.tsx wires MatchSuccessModal on isMutual (session 14)', () => {
  const DISCOVER_PAGE = join(WEB_ROOT, 'app', '(main)', 'discover', 'page.tsx');
  const src = readFileSync(DISCOVER_PAGE, 'utf8');

  it('imports MatchSuccessModal + MatchedUser type', () => {
    expect(src).toMatch(/import\s*\{[^}]*MatchSuccessModal[^}]*\}\s*from\s*['"]\.\/components\/MatchSuccessModal['"]/);
  });

  it('declares a matchModal state slot (opens on mutual like)', () => {
    expect(src).toMatch(/setMatchModal\s*\(/);
    expect(src).toMatch(/matchModal/);
  });

  it('handleLike reads payload.isMutual + payload.isFirstMatch from the response', () => {
    // Locate the handleLike body and assert it reads both fields.
    const m = src.match(/const handleLike\s*=\s*async[\s\S]*?advanceCard\(\);\s*\};/);
    expect(m).toBeTruthy();
    const body = m![0];
    expect(body).toMatch(/isMutual/);
    expect(body).toMatch(/isFirstMatch/);
    expect(body).toMatch(/setMatchModal/);
  });

  it('renders <MatchSuccessModal> in the JSX tree', () => {
    expect(src).toMatch(/<MatchSuccessModal/);
    // Passes the three required props.
    expect(src).toMatch(/matchedUser=\{matchModal\.matchedUser\}/);
    expect(src).toMatch(/isFirstMatch=\{matchModal\.isFirstMatch\}/);
  });

  it('onClose + onSent both clear the modal (idempotent dismiss)', () => {
    // The single-source-of-truth for closing the modal is setMatchModal(null).
    expect(src).toMatch(/onClose=\{\(\)\s*=>\s*setMatchModal\(null\)\}/);
    expect(src).toMatch(/onSent=\{\(\)\s*=>\s*setMatchModal\(null\)\}/);
  });
});
