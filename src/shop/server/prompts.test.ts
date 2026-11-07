import { describe, expect, it } from 'vitest';
import { buildPrompt, hasStylePrompt, PROMPT_STYLE_IDS, variationCount } from './prompts';
import { STYLES } from '../styles';

describe('shop prompts', () => {
  it('every store style has prompts, and every prompt set a store style', () => {
    expect(STYLES.map((s) => s.id).sort()).toEqual([...PROMPT_STYLE_IDS].sort());
    for (const s of STYLES) expect(hasStylePrompt(s.id)).toBe(true);
  });

  it('builds collection prompt + style prompt + scene + closing, with no unfilled {{…}}', () => {
    for (const id of PROMPT_STYLE_IDS) {
      for (let v = 0; v < variationCount(); v++) {
        const p = buildPrompt(id, v);
        expect(p).not.toMatch(/\{\{|\}\}/);
        expect(p.startsWith('You are creating one artwork in a coordinated four-piece personalized art collection.')).toBe(true);
        expect(p).toContain('Aspect ratio: 1:1');
        expect(p).toMatch(/STYLE LOCK:\n/);
        expect(p).toMatch(new RegExp(`\\n\\nSCENE ${v + 1} — [^\\n]+\\n`));
        expect(p.endsWith('No text, borders, logos, or watermarks.')).toBe(true);
      }
    }
  });

  it('4 different scenes, one shared style prompt per style', () => {
    for (const id of PROMPT_STYLE_IDS) {
      const prompts = [0, 1, 2, 3].map((v) => buildPrompt(id, v));
      expect(new Set(prompts).size).toBe(4);
      const stylePrompts = prompts.map((p) => p.split('Highest available quality.\n\n')[1].split(/\n\nSCENE \d — /)[0]);
      expect(new Set(stylePrompts).size).toBe(1);
      expect(stylePrompts[0]).toContain('Aspect ratio: 1:1');
    }
  });

  it("uses the owner's royal style prompt and scenes verbatim", () => {
    const p = buildPrompt('royal', 2);
    expect(p).toContain('Create a museum-quality Renaissance oil painting as part of a cohesive four-piece royal portrait collection.');
    expect(p).toContain('Authentic 17th-century European aristocratic oil painting.');
    expect(p).toContain('Aspect ratio: 1:1 (square, printed as a 20x20 cm framed tile).');
    expect(p).toContain('SCENE 3 — THE PALACE\nPortray the same royal character standing inside a grand historical palace corridor');
  });

  it("uses the owner's pet-life scenes verbatim, also in the collection's Scene line", () => {
    const p = buildPrompt('pet-life', 1);
    expect(p).toContain('Style: Humorous luxury lifestyle photography');
    expect(p).toContain('Scene: The subject is enjoying a bubble bath in a stylish bathtub with elegant bath accessories.');
    expect(p).toContain('ARTISTIC STYLE LOCK:\nUltra-photorealistic humorous luxury lifestyle photography. Warm beige and cream palette');
  });
});
