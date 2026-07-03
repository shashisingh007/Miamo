// Miamo Mobile — Feature-parity regression test.
// Reads FEATURE_PARITY_MATRIX.md §1 (top-level screens) and §2 (settings
// sub-screens) and asserts that every row's `Mobile Screen` file exists.
//
// Failure mode: rewriting the matrix without updating the screens (or vice-
// versa) will fail this test with a helpful diff.
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const MATRIX_PATH = path.join(ROOT, 'FEATURE_PARITY_MATRIX.md');
const SCREENS_DIR = path.join(ROOT, 'src', 'screens');

/**
 * Extract every markdown-table data row from the matrix and pluck the
 * Mobile Screen cell. The matrix has multiple sections (§1 top-level,
 * §2 settings sub-screens), each with its own header. We accept ANY row
 * whose first non-empty cell is a number.
 *
 * A row can name the file with a nested path (e.g. `settings/PrivacyScreen.tsx`
 * or `admin/FairnessScreen.tsx`). We resolve against `src/screens/`.
 */
function parseMatrixRows(md: string): Array<{ mobileScreen: string; label: string }> {
  const rows: Array<{ mobileScreen: string; label: string }> = [];
  const lines = md.split('\n');
  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 4) continue;
    const idx = cells[1];
    if (!/^\d+$/.test(idx)) continue;
    // Skip separator rows (e.g. `|---|---|`) — those are filtered by the
    // numeric-# check already, but be defensive against future re-formats.
    const label = cells[2];
    const cell = cells[3];
    // The Mobile Screen cell must look like a filename ending in .tsx. Some
    // rows in §1 may use bold or emphasis; strip common markdown wrappers.
    const cleaned = cell.replace(/[*_`]/g, '').trim();
    if (!cleaned.endsWith('.tsx')) continue;
    rows.push({ mobileScreen: cleaned, label });
  }
  return rows;
}

function listAllScreenFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const nested of listAllScreenFiles(full)) {
        out.push(`${entry}/${nested}`);
      }
      continue;
    }
    if (entry.endsWith('.tsx')) out.push(entry);
  }
  return out;
}

describe('feature parity matrix', () => {
  const md = readFileSync(MATRIX_PATH, 'utf8');
  const rows = parseMatrixRows(md);

  it('parses at least the expected number of rows (top-level + settings)', () => {
    // §1 top-level ≥ 30 + §2 settings ≥ 8 → ≥ 38.
    expect(rows.length).toBeGreaterThanOrEqual(38);
  });

  it.each(rows.map(r => [r.mobileScreen, r.label]))(
    '%s → screen file exists on disk',
    (mobileScreen: string, _label: string) => {
      const p = path.join(SCREENS_DIR, mobileScreen);
      expect(existsSync(p)).toBe(true);
    },
  );

  it('every screen file (nested included) is referenced in the matrix', () => {
    const referenced = new Set(rows.map(r => r.mobileScreen));
    const files = listAllScreenFiles(SCREENS_DIR);
    // Screens are matched by their path relative to src/screens/ so
    // `settings/PrivacyScreen.tsx` and `admin/FairnessScreen.tsx` are
    // valid cells.
    const missing = files.filter(f => !referenced.has(f));
    // If this fires, add the missing files to FEATURE_PARITY_MATRIX.md.
    expect(missing).toEqual([]);
  });
});
