import { describe, expect, it } from 'vitest';
import { buildPrompt, hasStylePrompt, PROMPT_STYLE_IDS, variationCount } from './prompts';
import { STYLES } from '../styles';

describe('shop prompts', () => {
  it('every store style has a prompt, and every prompt a store style', () => {
    expect(STYLES.map((s) => s.id).sort()).toEqual([...PROMPT_STYLE_IDS].sort());
    for (const s of STYLES) expect(hasStylePrompt(s.id)).toBe(true);
  });

  it('fills every variable and appends the global prompt', () => {
    for (const id of PROMPT_STYLE_IDS) {
      for (let v = 0; v < variationCount(); v++) {
        const p = buildPrompt(id, v);
        expect(p).not.toMatch(/\{\{|\}\}/);
        expect(p).toContain('Use the uploaded image as the primary visual identity reference');
        expect(p).toContain('aspect ratio: 1:1');
      }
    }
  });

  it('gives the 4 versions 4 different values', () => {
    for (const id of PROMPT_STYLE_IDS) {
      expect(new Set([0, 1, 2, 3].map((v) => buildPrompt(id, v))).size).toBe(4);
    }
    expect(buildPrompt('pet-life', 1)).toContain('Place the pet in a human-like situation: relaxing in a bubble bath');
    expect(buildPrompt('royal', 0)).toContain('Portray the subject as a majestic king or queen');
  });
});
