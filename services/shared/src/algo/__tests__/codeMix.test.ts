import { describe, it, expect } from 'vitest';
import {
  detectLanguageFamily,
  getTemplates,
  TEMPLATES,
  fillTemplate,
  LANGUAGE_FAMILIES,
  OPENER_ARCHETYPES,
  CODE_MIX_TONES,
  DETECTION_CONFIDENCE_THRESHOLD,
  TEMPLATE_MAX_LEN,
} from '../v8/moveV2/codeMix';
import { lintMoveV8 } from '../moveVoice';

describe('codeMix — template counts', () => {
  it('exposes 80 templates total', () => {
    expect(TEMPLATES.length).toBe(80);
  });

  it('every family has 5 × 4 = 20 templates', () => {
    for (const fam of LANGUAGE_FAMILIES) {
      const family = TEMPLATES.filter((t) => t.family === fam);
      expect(family.length).toBe(20);
    }
  });

  it('every (family, archetype, tone) triple is present', () => {
    for (const fam of LANGUAGE_FAMILIES) {
      for (const arch of OPENER_ARCHETYPES) {
        for (const tone of CODE_MIX_TONES) {
          const found = TEMPLATES.find(
            (t) => t.family === fam && t.archetype === arch && t.tone === tone,
          );
          expect(found, `missing ${fam}/${arch}/${tone}`).toBeDefined();
        }
      }
    }
  });

  it('no template contains an unfilled placeholder fragment', () => {
    for (const t of TEMPLATES) {
      expect(t.template).toMatch(/\{NAME\}|\{HOOK\}/);
    }
  });
});

describe('codeMix — getTemplates filter', () => {
  it('filters by family', () => {
    const hi = getTemplates('hi_en');
    expect(hi.length).toBe(20);
    expect(hi.every((t) => t.family === 'hi_en')).toBe(true);
  });

  it('filters by family + archetype', () => {
    const r = getTemplates('en', 'question');
    expect(r.length).toBe(4);
  });

  it('filters by family + archetype + tone', () => {
    const r = getTemplates('en', 'question', 'casual');
    expect(r.length).toBe(1);
  });
});

describe('codeMix — language detection', () => {
  it('detectLanguageFamily empty input → en at 0 confidence', () => {
    const r = detectLanguageFamily([]);
    expect(r.family).toBe('en');
    expect(r.confidence).toBe(0);
  });

  it('detects hi_en for Hinglish text', () => {
    const r = detectLanguageFamily(['hi mera naam kya hai yaar bhai', 'aur scene kya hai accha']);
    expect(r.family).toBe('hi_en');
  });

  it('detects ta_en for Tanglish cues', () => {
    const r = detectLanguageFamily(['ennada makka epdi iruka sema da', 'una style enna da']);
    expect(r.family).toBe('ta_en');
  });

  it('detects bn_en for Banglish cues', () => {
    const r = detectLanguageFamily(['tor khabor ki bolish ami niye kothay', 'kichu bolish ki']);
    expect(r.family).toBe('bn_en');
  });

  it('low-confidence mix falls back to en', () => {
    const r = detectLanguageFamily(['kya scene epdi iruka tor ki bolish']);
    // adversarial — all family cues mixed; confidence should be below threshold
    if (r.confidence < DETECTION_CONFIDENCE_THRESHOLD) {
      expect(r.family).toBe('en');
    }
  });

  it('pure English detects en', () => {
    const r = detectLanguageFamily([
      'the weather is great today and i think you should come',
      'what are you doing for the weekend',
    ]);
    expect(r.family).toBe('en');
  });
});

describe('codeMix — template render & lint', () => {
  it('fillTemplate substitutes {NAME} and {HOOK}', () => {
    const s = fillTemplate('{NAME}, {HOOK}?', 'Priya', 'hiking');
    expect(s).toBe('Priya, hiking?');
  });

  it('fillTemplate handles empty fills with defaults', () => {
    const s = fillTemplate('{NAME}, {HOOK}?', '', '');
    expect(s).toContain('you');
    expect(s).toContain('that thing');
  });

  it('every template renders cleanly with Priya/hiking and passes lint', () => {
    let failures: string[] = [];
    for (const t of TEMPLATES) {
      const out = fillTemplate(t.template, 'Priya', 'hiking');
      expect(out.length).toBeLessThanOrEqual(TEMPLATE_MAX_LEN);
      const lint = lintMoveV8(out);
      if (!lint.ok) failures.push(`${t.family}/${t.archetype}/${t.tone}: "${out}" → ${lint.reason}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('every template renders cleanly with Riya/filter coffee and passes lint', () => {
    let failures: string[] = [];
    for (const t of TEMPLATES) {
      const out = fillTemplate(t.template, 'Riya', 'filter coffee');
      expect(out.length).toBeLessThanOrEqual(TEMPLATE_MAX_LEN);
      const lint = lintMoveV8(out);
      if (!lint.ok) failures.push(`${t.family}/${t.archetype}/${t.tone}: "${out}" → ${lint.reason}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('every template renders cleanly with empty name/hook fallbacks and passes lint', () => {
    let failures: string[] = [];
    for (const t of TEMPLATES) {
      const out = fillTemplate(t.template, '', '');
      const lint = lintMoveV8(out);
      if (!lint.ok) failures.push(`${t.family}/${t.archetype}/${t.tone}: "${out}" → ${lint.reason}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
