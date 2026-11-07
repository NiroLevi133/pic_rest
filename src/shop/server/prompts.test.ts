import { describe, expect, it } from 'vitest';
import { buildPrompt, hasStylePrompt, PROMPT_STYLE_IDS, variationCount } from './prompts';
import { STYLES } from '../styles';

describe('shop prompts', () => {
  it('every store style has prompts, and every prompt set a store style', () => {
    expect(STYLES.map((s) => s.id).sort()).toEqual([...PROMPT_STYLE_IDS].sort());
    for (const s of STYLES) expect(hasStylePrompt(s.id)).toBe(true);
  });

  it('builds collection prompt + style lock + scene + closing, with no unfilled {{…}}', () => {
    for (const id of PROMPT_STYLE_IDS) {
      for (let v = 0; v < variationCount(); v++) {
        const p = buildPrompt(id, v);
        expect(p).not.toMatch(/\{\{|\}\}/);
        expect(p.startsWith('You are creating one artwork in a coordinated four-piece personalized art collection.')).toBe(true);
        expect(p).toContain('Aspect ratio: 1:1');
        expect(p).toContain(`IMAGE ${v + 1}\nSTYLE LOCK:`);
        expect(p).toContain(`SCENE ${v + 1}:`);
        expect(p.endsWith('No text, borders, logos, or watermarks.')).toBe(true);
      }
    }
  });

  it('4 different scenes, one shared style lock per style', () => {
    for (const id of PROMPT_STYLE_IDS) {
      const prompts = [0, 1, 2, 3].map((v) => buildPrompt(id, v));
      expect(new Set(prompts).size).toBe(4);
      const locks = prompts.map((p) => p.split('STYLE LOCK:\n')[1].split('\n\n')[0]);
      expect(new Set(locks).size).toBe(1);
    }
  });

  it("uses the owner's pet-life scenes verbatim, also in the collection's Scene line", () => {
    const p = buildPrompt('pet-life', 1);
    expect(p).toContain('Style: Humorous luxury lifestyle photography');
    expect(p).toContain('Scene: The subject is enjoying a bubble bath in a stylish bathtub with elegant bath accessories.');
    expect(p).toContain('STYLE LOCK:\nUltra-photorealistic humorous luxury lifestyle photography. Warm beige and cream palette');
  });
});
