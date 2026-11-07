/**
 * Image prompts for each store style. Server-only: never sent to the browser.
 *
 * Each style prompt has one {{variable}}. Every upload makes 4 versions, and each version
 * fills the variable with a different value from `variations`, so the customer gets 4 real choices.
 * The global prompt is appended to every style.
 */

interface StylePrompt {
  prompt: string;
  /** The {{name}} in the prompt that changes between the 4 versions */
  variable: string;
  variations: [string, string, string, string];
}

/** Square tiles only (20×20 cm). */
const ASPECT_RATIO = '1:1 (square, printed as a 20x20 cm framed tile)';

const GLOBAL_PROMPT =
  'Use the uploaded image as the primary visual identity reference, not merely as inspiration. Preserve all distinctive identity characteristics as accurately as possible. Maintain the exact number of subjects. Create a standalone, print-ready artwork, not a framed mockup or photograph of artwork on a wall. Respect the requested output aspect ratio: {{aspect_ratio}}. Keep important subjects and details within a safe margin for printing. No typography, logos, borders, signatures, or watermarks. Produce the highest available image quality.';

const STYLE_PROMPTS: Record<string, StylePrompt> = {
  'pet-life': {
    prompt:
      "Transform the pet in the uploaded reference image into a humorous, ultra-photorealistic lifestyle portrait. Place the pet in a human-like situation: {{scene}}. Preserve the pet's exact breed, fur colors, markings, facial structure, eye color, and recognizable identity. The pet should remain anatomically believable while naturally interacting with the scene. Create a premium editorial photograph with realistic textures, cinematic lighting, playful details, and sophisticated composition. The result should look like an authentic professional photograph, not a cartoon. No text, no watermark, no distorted anatomy, no extra limbs.",
    variable: 'scene',
    variations: [
      'reading the morning newspaper with a cup of coffee at a sunny kitchen table',
      'relaxing in a bubble bath with cucumber slices over its eyes and a rubber duck nearby',
      'working seriously on a laptop at a modern home office desk, wearing reading glasses',
      'cooking in a cozy kitchen wearing a small chef apron, tasting from a wooden spoon',
    ],
  },
  royal: {
    prompt:
      "Create an exquisite Renaissance-style royal oil painting using the uploaded reference image as the primary identity reference. Portray the subject as a majestic {{royal_role}}, wearing luxurious historical royal garments, intricate embroidery, and elegant accessories. Preserve the subject's exact facial features, expression, fur patterns or human likeness. Use dramatic chiaroscuro lighting, deep burgundy and gold tones, rich oil-paint textures, and a dark classical background. The composition should resemble an authentic museum-quality aristocratic portrait. Timeless, sophisticated, highly detailed, and realistic. No text, no watermark, no additional subjects.",
    variable: 'royal_role',
    variations: [
      'king or queen on a velvet throne, wearing a jeweled crown and ermine-trimmed robe',
      'noble duke or duchess with a lace collar and a gold chain of office',
      'emperor or empress in a regal military uniform with medals and a sash',
      'young prince or princess holding a royal scepter, wearing a delicate tiara or circlet',
    ],
  },
  minimal: {
    prompt:
      "Transform the uploaded reference image into an elegant, minimalist fine-art portrait created using {{art_medium}}. Preserve the subject's recognizable identity, proportions, facial features, natural expression, and distinctive characteristics. Use delicate artistic strokes, soft muted colors, subtle paper textures, and gentle natural shading. Place the subject against a clean ivory or warm beige background with generous negative space. The artwork should feel handcrafted, refined, emotional, and timeless, suitable for a premium Scandinavian-inspired interior. Avoid excessive detail, harsh outlines, saturated colors, text, watermarks, and unnecessary background objects.",
    variable: 'art_medium',
    variations: [
      'soft watercolor washes',
      'fine graphite pencil',
      'charcoal with subtle pastel accents',
      'delicate ink line and light wash',
    ],
  },
  family: {
    prompt:
      "Create a beautiful, personalized family portrait illustration based on the uploaded reference image. Carefully preserve the exact number of people and pets, their recognizable facial features, hairstyles, skin tones, body proportions, clothing characteristics, and relative positions. Illustrate the family in a sophisticated, contemporary hand-painted style with warm neutral colors, delicate textures, soft natural lighting, and a {{background_style}} background. Capture genuine warmth, connection, and personality while maintaining accurate individual identities. Create a balanced, harmonious composition suitable for a meaningful personalized wall-art gift. No additional people or pets, no missing family members, no distorted faces, no text, no watermark.",
    variable: 'background_style',
    variations: [
      'soft botanical with delicate leaves and flowers',
      'warm abstract with gentle brushstroke shapes',
      'minimal sunlit living room',
      'calm Mediterranean beach at golden hour',
    ],
  },
  animated: {
    prompt:
      "Transform the subject in the uploaded reference image into a charming, premium 3D animated feature-film character. Preserve the subject's recognizable identity, distinctive facial features, hairstyle or fur patterns, eye color, and personality. Use expressive but believable eyes, appealing character proportions, beautifully detailed textures, soft cinematic lighting, and sophisticated animated-film rendering. Place the character in a visually stunning {{movie_theme}} environment. The final artwork should feel like a polished frame from a major animated movie, with vibrant yet harmonious colors, depth of field, and magical atmosphere. Avoid generic character faces, identity changes, extra limbs, text, logos, and watermarks.",
    variable: 'movie_theme',
    variations: [
      'enchanted forest with glowing fireflies',
      'sunny Mediterranean seaside town',
      'cozy snowy village at dusk',
      'magical starry night sky above the clouds',
    ],
  },
};

export function hasStylePrompt(styleId: string): boolean {
  return styleId in STYLE_PROMPTS;
}

export function variationCount(): number {
  return 4;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, name: string) => values[name] ?? m);
}

export function buildPrompt(styleId: string, variation: number): string {
  const style = STYLE_PROMPTS[styleId];
  if (!style) throw new Error(`unknown style ${styleId}`);
  const value = style.variations[variation % style.variations.length];
  return [
    fill(style.prompt, { [style.variable]: value }),
    fill(GLOBAL_PROMPT, { aspect_ratio: ASPECT_RATIO }),
  ].join('\n\n');
}

/** For tests: every style id with a prompt. */
export const PROMPT_STYLE_IDS = Object.keys(STYLE_PROMPTS);
