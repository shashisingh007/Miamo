import { describe, it, expect } from 'vitest';
import {
  explainCompatibility,
  supportedIngredients,
  templateVariantCount,
  type ExplainerInput,
} from '../../v9/compatibilityExplainer';

describe('v9/compatibilityExplainer', () => {
  it('every supported ingredient has ≥2 template variants', () => {
    for (const name of supportedIngredients()) {
      expect(templateVariantCount(name)).toBeGreaterThanOrEqual(2);
    }
  });

  it('returns [] for empty ingredients', () => {
    expect(explainCompatibility({ ingredients: [] })).toEqual([]);
  });

  it('returns up to maxReasons (default 3)', () => {
    const inp: ExplainerInput = {
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
        { name: 'chronotypeMatch', contribution: 0.5, detail: 'night owls' },
        { name: 'replyPaceMatch', contribution: 0.4 },
        { name: 'ageSimilarity', contribution: 0.2 },
      ],
    };
    const r = explainCompatibility(inp);
    expect(r.length).toBe(3);
  });

  it('sorted by contribution desc', () => {
    const inp: ExplainerInput = {
      ingredients: [
        { name: 'chronotypeMatch', contribution: 0.3 },
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
        { name: 'replyPaceMatch', contribution: 0.6 },
      ],
    };
    const r = explainCompatibility(inp);
    expect(r[0].ingredient).toBe('interestsOverlap');
    expect(r[1].ingredient).toBe('replyPaceMatch');
    expect(r[2].ingredient).toBe('chronotypeMatch');
  });

  it('stars: top 3 → 2 → 1', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.9, detail: 'hiking' },
        { name: 'chronotypeMatch', contribution: 0.7, detail: 'day people' },
        { name: 'ageSimilarity', contribution: 0.5 },
      ],
    });
    expect(r[0].stars).toBe(3);
    expect(r[1].stars).toBe(2);
    expect(r[2].stars).toBe(1);
  });

  it('drops zero-contribution ingredients', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.5, detail: 'x' },
        { name: 'vibeAlignment', contribution: 0 },
      ],
    });
    expect(r.length).toBe(1);
    expect(r[0].ingredient).toBe('interestsOverlap');
  });

  it('worked example from Phase E spec renders sensibly', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
        { name: 'replyPaceMatch', contribution: 0.7 },
        { name: 'chronotypeMatch', contribution: 0.5, detail: 'night owls' },
      ],
    });
    expect(r[0].reason.toLowerCase()).toContain('photography');
    expect(r[1].reason.toLowerCase()).toMatch(/reply|pace/);
    expect(r[2].reason.toLowerCase()).toContain('night owls');
  });

  it('supports maxReasons=1', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
        { name: 'chronotypeMatch', contribution: 0.5 },
      ],
      maxReasons: 1,
    });
    expect(r).toHaveLength(1);
  });

  it('unknown ingredient uses fallback template', () => {
    const r = explainCompatibility({
      ingredients: [{ name: 'mysteryFactor', contribution: 0.5 }],
    });
    expect(r).toHaveLength(1);
    expect(r[0].reason.toLowerCase()).toContain('mysteryfactor');
  });

  it('deterministic — same input → same output', () => {
    const inp: ExplainerInput = {
      ingredients: [
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
        { name: 'vibeAlignment', contribution: 0.6 },
      ],
    };
    const a = explainCompatibility(inp);
    const b = explainCompatibility(inp);
    expect(a).toEqual(b);
  });

  it('different detail rotates to a different template variant', () => {
    // Try different details until we see two different outputs — because
    // the hash is stable but the pool has ≥2 variants, two well-chosen
    // details land on different rotations.
    const outputs = new Set<string>();
    for (const detail of ['photography', 'hiking', 'poetry', 'concerts', 'cooking', 'running', 'painting']) {
      const r = explainCompatibility({
        ingredients: [{ name: 'interestsOverlap', contribution: 0.9, detail }],
      });
      outputs.add(r[0].reason);
    }
    // Should see at least 2 unique templates rendered.
    expect(outputs.size).toBeGreaterThanOrEqual(2);
  });

  it('ties broken alphabetically (deterministic ordering)', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'chronotypeMatch', contribution: 0.5 },
        { name: 'ageSimilarity', contribution: 0.5 },
      ],
    });
    expect(r[0].ingredient).toBe('ageSimilarity');
    expect(r[1].ingredient).toBe('chronotypeMatch');
  });

  it('no leading/trailing whitespace or double spaces in reasons', () => {
    const r = explainCompatibility({
      ingredients: [
        { name: 'chronotypeMatch', contribution: 0.5 },
        { name: 'interestsOverlap', contribution: 0.9, detail: 'photography' },
      ],
    });
    for (const x of r) {
      expect(x.reason).toBe(x.reason.trim());
      expect(x.reason).not.toMatch(/ {2,}/);
    }
  });

  it('property: |output| ≤ min(maxReasons, non-zero ingredient count) always', () => {
    const seeds = [0.1, 0.5, 0, 0.9, 0.3, 0.6];
    for (const max of [1, 2, 3, 5]) {
      const ings = seeds.map((c, i) => ({ name: `ing${i}`, contribution: c }));
      const r = explainCompatibility({ ingredients: ings, maxReasons: max });
      const nz = seeds.filter((x) => x > 0).length;
      expect(r.length).toBeLessThanOrEqual(Math.min(max, nz));
    }
  });

  it('property: output ordering strictly follows sorted contributions', () => {
    const ings = [
      { name: 'a', contribution: 0.1 },
      { name: 'b', contribution: 0.4 },
      { name: 'c', contribution: 0.3 },
    ];
    const r = explainCompatibility({ ingredients: ings });
    expect(r.map((x) => x.ingredient)).toEqual(['b', 'c', 'a']);
  });
});
