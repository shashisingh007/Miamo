#!/usr/bin/env node
/**
 * codemod-color-harmonize.mjs
 *
 * One-shot color harmonization for v2.6+. Maps decorative Tailwind palette
 * (amber/violet/sky/emerald/etc.) and Tailwind's default hot-pink rose-{50..900}
 * to the brand copper tokens (rose-main, rose-dark, rose-alt, rose-light, rose-soft).
 *
 * Preserves SEMANTIC colors:
 *   - red-* (true destructive / form errors)
 *   - emerald-* in success badges / toast pills (variant prop driven)
 *   - amber-* in warning toast variant
 *
 * Scope: services/web/src/app/(main)/**\/*.tsx and select component dirs.
 * Skip list: components/ui/toast.tsx, modal.tsx (semantic variants live there).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = '/Users/singhshs/Downloads/Miamo/services/web/src';
const SCAN_DIRS = [
  path.join(ROOT, 'app', '(main)'),
];
const SKIP_FILES = new Set([
  path.join(ROOT, 'components', 'ui', 'toast.tsx'),
  path.join(ROOT, 'components', 'ui', 'modal.tsx'),
  path.join(ROOT, 'components', 'ui', 'button.tsx'), // already audited
  path.join(ROOT, 'components', 'ui', 'input.tsx'),  // semantic red error
  path.join(ROOT, 'components', 'ui', 'error-boundary.tsx'), // semantic red
  path.join(ROOT, 'components', 'ui', 'index.tsx'),  // semantic badge variants
]);

// Decorative palette families to harmonize → copper rose family
// Each src family maps to a deterministic copper variant by shade level.
//
// Shade level mapping (Tailwind numeric → brand token):
//   50, 100        → rose-soft  (#F5EDE8)  — lightest tint
//   200, 300       → rose-light (#E8A87C)  — soft accent
//   400            → rose-alt   (#D4896A)  — mid copper
//   500, 600       → rose-main  (#C97856)  — brand main
//   700, 800, 900  → rose-dark  (#B8694A)  — deep copper
const SHADE_TO_TOKEN = {
  50: 'rose-soft',
  100: 'rose-soft',
  200: 'rose-light',
  300: 'rose-light',
  400: 'rose-alt',
  500: 'rose-main',
  600: 'rose-main',
  700: 'rose-dark',
  800: 'rose-dark',
  900: 'rose-dark',
};

// Families that get harmonized (decorative).
const HARMONIZE_FAMILIES = [
  'amber', 'orange', 'yellow',
  'violet', 'purple', 'indigo', 'fuchsia', 'pink',
  'sky', 'blue', 'cyan', 'teal',
  'lime', 'green', 'emerald',
];

// Tailwind's default rose-{n} = hot pink, always wrong for brand. Harmonize too.
const PINK_ROSE_NUMERIC = true;

// Prefixes we target on Tailwind classes.
const PREFIXES = [
  'text', 'bg', 'border', 'ring', 'from', 'to', 'via',
  'shadow', 'fill', 'stroke', 'placeholder', 'accent',
  'decoration', 'caret', 'divide', 'outline',
];

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

function buildReplacements() {
  const reps = [];
  for (const family of HARMONIZE_FAMILIES) {
    for (const shade of SHADES) {
      const token = SHADE_TO_TOKEN[shade];
      for (const prefix of PREFIXES) {
        // e.g. text-amber-500 → text-rose-main
        reps.push([
          new RegExp(`\\b${prefix}-${family}-${shade}\\b`, 'g'),
          `${prefix}-${token}`,
        ]);
        // hover:/focus:/group-hover:/dark: prefixed
        for (const mod of ['hover:', 'focus:', 'group-hover:', 'group-focus:', 'focus-within:', 'group-focus-within:', 'active:', 'dark:', 'md:', 'lg:', 'sm:', 'xl:']) {
          reps.push([
            new RegExp(`\\b${mod}${prefix}-${family}-${shade}\\b`, 'g'),
            `${mod}${prefix}-${token}`,
          ]);
        }
      }
    }
  }
  if (PINK_ROSE_NUMERIC) {
    for (const shade of SHADES) {
      const token = SHADE_TO_TOKEN[shade];
      for (const prefix of PREFIXES) {
        reps.push([
          new RegExp(`\\b${prefix}-rose-${shade}\\b`, 'g'),
          `${prefix}-${token}`,
        ]);
        for (const mod of ['hover:', 'focus:', 'group-hover:', 'group-focus:', 'focus-within:', 'group-focus-within:', 'active:', 'dark:', 'md:', 'lg:', 'sm:', 'xl:']) {
          reps.push([
            new RegExp(`\\b${mod}${prefix}-rose-${shade}\\b`, 'g'),
            `${mod}${prefix}-${token}`,
          ]);
        }
      }
    }
  }
  return reps;
}

const REPLACEMENTS = buildReplacements();

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && (full.endsWith('.tsx') || full.endsWith('.ts'))) out.push(full);
  }
  return out;
}

function transform(content) {
  let next = content;
  for (const [re, repl] of REPLACEMENTS) {
    next = next.replace(re, repl);
  }
  // Fix double-slash bug like /15/40 or /10/40 (invalid Tailwind opacity stack)
  next = next.replace(/(\/(?:5|10|15|20|25|30|40|50|60|70|75|80|90))\/(?:5|10|15|20|25|30|40|50|60|70|75|80|90)\b/g, '$1');
  return next;
}

let scanned = 0, changed = 0;
const changedFiles = [];
for (const dir of SCAN_DIRS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    if (SKIP_FILES.has(file)) continue;
    scanned++;
    const src = fs.readFileSync(file, 'utf8');
    const out = transform(src);
    if (out !== src) {
      fs.writeFileSync(file, out, 'utf8');
      changed++;
      changedFiles.push(file.replace(ROOT + '/', ''));
    }
  }
}

console.log(`Scanned: ${scanned}`);
console.log(`Modified: ${changed}`);
for (const f of changedFiles) console.log(`  ~ ${f}`);
