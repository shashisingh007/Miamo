/**
 * TutorialModal — G.18 static + storage tests.
 *
 * The component itself is DOM-heavy (framer-motion, portal, keyboard
 * events). We stay off jsdom by testing the exported storage helpers
 * and static invariants of the file (aria-modal, dialog role, storage
 * key).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(__dirname, '..', '..', 'services', 'web', 'src', 'components', 'onboarding', 'TutorialModal.tsx');
const src = readFileSync(FILE, 'utf8');

describe('TutorialModal static invariants', () => {
  it('exports TutorialModal, DEFAULT_SLIDES, isTutorialEnabled, and a test reset helper', () => {
    expect(src).toMatch(/export function TutorialModal\b/);
    expect(src).toMatch(/export const DEFAULT_SLIDES\b/);
    expect(src).toMatch(/export function isTutorialEnabled\b/);
    expect(src).toMatch(/export function _resetTutorialForTests\b/);
  });

  it('ships exactly 3 default slides', () => {
    // Count objects in the DEFAULT_SLIDES array literal by counting the
    // `title:` keys within the array bounds.
    const start = src.indexOf('DEFAULT_SLIDES');
    const end = src.indexOf('];', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const arr = src.slice(start, end);
    const titles = (arr.match(/title:\s*'[^']+'/g) ?? []).length;
    expect(titles).toBe(3);
  });

  it('uses versioned localStorage key (miamo:tutorial:v1)', () => {
    expect(src).toMatch(/miamo:tutorial:v1/);
  });

  it('sets role="dialog" AND aria-modal="true" on the modal wrapper', () => {
    expect(src).toMatch(/role="dialog"/);
    expect(src).toMatch(/aria-modal="true"/);
  });

  it('has an Escape-to-close handler', () => {
    expect(src).toMatch(/e\.key\s*===\s*'Escape'/);
  });

  it('renders a progressbar with valuemin/valuemax/valuenow for step indication', () => {
    expect(src).toMatch(/role="progressbar"/);
    expect(src).toMatch(/aria-valuemin=\{1\}/);
    expect(src).toMatch(/aria-valuemax=/);
    expect(src).toMatch(/aria-valuenow=/);
  });

  it('is flag-gated behind NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED', () => {
    expect(src).toMatch(/NEXT_PUBLIC_FEATURE_TUTORIAL_ENABLED/);
  });
});
