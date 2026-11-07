/** What each style looks like, in words the image model follows. */
const STYLE_PROMPTS: Record<string, string> = {
  oil: 'a museum-quality classical oil painting portrait with visible, confident brushstrokes, rich warm tones and a dark, softly painted background',
  watercolor: 'a delicate watercolor painting on textured cold-press paper, soft color washes, gentle bleeding edges and a light, airy background',
  sketch: 'a detailed graphite pencil drawing on cream paper, fine cross-hatching and soft shading, monochrome, artist sketchbook quality',
  royal: 'a 17th-century royal court portrait: velvet robes, ermine collar, jewels and a small crown, ornate palace interior behind, dramatic oil-painting light',
  animated: 'a charming 3D animated feature-film character render: big expressive eyes, smooth stylized features, soft studio lighting and a clean pastel background',
  caricature: 'a fun hand-drawn caricature with a slightly enlarged head and big friendly expression, colored pencil and marker on white paper',
  popart: 'a bold pop-art portrait with thick black outlines, flat saturated colors, halftone dot accents and a vivid solid-color background',
};

/** The 4 variations differ in composition so the customer gets a real choice. */
const VARIATIONS = [
  'Framing: classic centered head-and-shoulders portrait.',
  'Framing: slightly wider, showing a bit more of the body and setting.',
  'Mood: warm, soft lighting with a calm, simple background.',
  'Mood: a bolder, more playful and expressive take on the style.',
];

export function hasStylePrompt(styleId: string): boolean {
  return styleId in STYLE_PROMPTS;
}

export function variationCount(): number {
  return VARIATIONS.length;
}

export function buildPrompt(styleId: string, variation: number): string {
  const style = STYLE_PROMPTS[styleId];
  return [
    `Turn the attached photo into ${style}.`,
    'Keep every person and animal clearly recognizable: the same faces and facial features, skin tone, hair, eye color, fur colors and markings, and exactly the same number of subjects. Do not add or remove anyone.',
    'Square 1:1 artwork made to be printed as a 20x20 cm framed wall tile: subjects centered, with comfortable space near the edges.',
    VARIATIONS[variation % VARIATIONS.length],
    'No text, letters, signatures, watermarks, frames or borders inside the image.',
  ].join('\n');
}
