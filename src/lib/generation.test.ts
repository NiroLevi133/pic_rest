import { describe, it, expect, vi } from 'vitest';

vi.mock('./prisma', () => ({ prisma: {} }));
vi.mock('./settings', () => ({ getSettings: vi.fn() }));
vi.mock('./storage', () => ({ persistImage: vi.fn() }));

import { buildPrompt } from './generation';
import { FIXED_PROMPT } from './prompt-engine';

describe('buildPrompt', () => {
  it('falls back to the fixed prompt without a style', () => {
    expect(buildPrompt({})).toBe(FIXED_PROMPT);
  });

  it('uses the raw prompt verbatim', () => {
    expect(buildPrompt({ rawPrompt: true, customPrompt: '  hello  ' })).toBe('hello');
  });

  it('appends free-text instructions to a preset', () => {
    const p = buildPrompt({ customPrompt: 'more parsley' });
    expect(p.startsWith(FIXED_PROMPT)).toBe(true);
    expect(p).toContain('more parsley');
  });

  it('builds a custom-style prompt from a style description', () => {
    const p = buildPrompt({ styleKey: 'custom', styleDescription: 'Photography style: moody', customPrompt: 'x' });
    expect(p).toContain('Photography style: moody');
    expect(p).toContain('Additional user instructions: x');
  });

  it('adds advanced directives and caption', () => {
    const p = buildPrompt({
      advancedOptions: { angle: 'side', festive: true },
      captionOverlay: { enabled: true, text: 'שבת שלום', style: 'bold' },
    });
    expect(p).toContain('direct side angle');
    expect(p).toContain('festive');
    expect(p).toContain('"שבת שלום"');
  });

  it('substitutes clothing when product images are given', () => {
    const p = buildPrompt({
      rawPrompt: true,
      customPrompt: 'model wearing oversized plain white t-shirt, classic blue jeans',
      productImages: { shirt: 'data:x' },
    });
    expect(p).toContain('the exact shirt from the shirt product image, classic blue jeans');
  });
});
