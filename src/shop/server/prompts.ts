/**
 * Image prompts for the store. Server-only: never sent to the browser.
 *
 * Every upload makes a 4-piece collection. Each of the 4 images gets:
 *   1. COLLECTION_PROMPT — the same for every style and image ({{style_name}}, {{scene_description}}, {{aspect_ratio}} filled in)
 *   2. STYLE LOCK      — the same for all 4 images of a style (keeps the collection consistent)
 *   3. SCENE n         — different for each of the 4 images
 *   4. IMAGE_CLOSING   — the same for every image
 *
 * A style may have an approved style reference image (`reference`): it is sent as a second image,
 * after the customer's photo, and the prompt tells the model it defines only the visual treatment.
 */

interface CollectionStyle {
  /** English name, filled into {{style_name}} */
  name: string;
  styleLock: string;
  scenes: [string, string, string, string];
  /** Optional approved style reference image (https URL). */
  reference?: string;
}

/** Square tiles only (20×20 cm). */
const ASPECT_RATIO = '1:1 (square, printed as a 20x20 cm framed tile)';

const COLLECTION_PROMPT = `You are creating one artwork in a coordinated four-piece personalized art collection.

PRIMARY IDENTITY REFERENCE:
Use the uploaded original photograph as the authoritative reference for the subject's identity. Preserve the exact recognizable facial features, proportions, fur patterns, breed, hairstyle, eye color, skin tone, and distinctive characteristics as applicable.

STYLE CONSISTENCY:
All four artworks must share the same artistic medium, rendering technique, color palette, lighting characteristics, texture, background aesthetic, and overall visual mood.

SCENE VARIATION:
Each artwork must depict the subject in a different scene and action. Change only the scene-specific elements while keeping the identity and overall artistic direction consistent.

REFERENCE PRIORITY:
The original photograph defines identity. The approved style reference defines visual treatment. Never copy an incorrect face or altered identity from the style reference.

OUTPUT:
Create exactly ONE standalone artwork for the requested scene, not a collage, grid, mockup, or framed product photograph.

Aspect ratio: {{aspect_ratio}}
Style: {{style_name}}
Scene: {{scene_description}}

Keep important details within a print-safe margin. No typography, signatures, logos, borders, or watermarks. Highest available quality.`;

const IMAGE_CLOSING =
  "Use the original uploaded image as the primary identity reference. Preserve the exact recognizable identity. Match the approved collection's artistic treatment. Create only this single scene as a standalone print-ready artwork, not a collage. No text, borders, logos, or watermarks.";

const STYLES: Record<string, CollectionStyle> = {
  // From the owner, verbatim.
  'pet-life': {
    name: 'Humorous luxury lifestyle photography',
    styleLock:
      'Ultra-photorealistic humorous luxury lifestyle photography. Warm beige and cream palette, soft editorial lighting, realistic fur and skin textures, sophisticated bathroom and home interiors.',
    scenes: [
      'The subject is relaxing in a luxurious spa wearing a white bathrobe and a towel on the head.',
      'The subject is enjoying a bubble bath in a stylish bathtub with elegant bath accessories.',
      'The subject is sitting at a beautiful kitchen table with a cup of coffee and a relaxed morning atmosphere.',
      'The subject is sitting comfortably in a stylish bathroom reading a newspaper.',
    ],
  },

  // Drafts in the same structure, based on the owner's earlier style prompts — review and replace freely.
  royal: {
    name: 'Renaissance royal oil painting',
    styleLock:
      'Exquisite Renaissance-style royal oil painting. Luxurious historical royal garments with intricate embroidery and elegant accessories, dramatic chiaroscuro lighting, deep burgundy and gold tones, rich oil-paint textures, dark classical background. Authentic museum-quality aristocratic portrait.',
    scenes: [
      'The subject is seated on a velvet throne as a majestic king or queen, wearing a jeweled crown and an ermine-trimmed robe.',
      'The subject stands in a candlelit palace library as a noble duke or duchess, wearing a lace collar and a gold chain of office.',
      'The subject poses beside a marble column as an emperor or empress in a regal uniform with medals and a silk sash.',
      'The subject holds a royal scepter in a palace garden at dusk as a young prince or princess, wearing a delicate circlet.',
    ],
  },
  minimal: {
    name: 'Minimalist fine-art portrait',
    styleLock:
      'Elegant minimalist fine-art portrait in soft watercolor with delicate pencil lines. Soft muted colors, subtle paper texture, gentle natural shading, clean ivory or warm beige background with generous negative space. Handcrafted, refined and timeless, suitable for a Scandinavian-inspired interior.',
    scenes: [
      'A calm close-up portrait of the subject looking gently toward the viewer.',
      'The subject in a graceful side profile, eyes softly looking into the distance.',
      'The subject resting peacefully beside a single small sprig of olive leaves.',
      'The subject in a quiet, joyful moment, mid-movement, with a light breeze suggested by a few loose strokes.',
    ],
  },
  family: {
    name: 'Contemporary hand-painted family portrait',
    styleLock:
      'Sophisticated contemporary hand-painted family illustration. Warm neutral colors, delicate textures, soft natural lighting. Keep the exact number of people and pets, their recognizable faces, hairstyles, skin tones, body proportions, clothing characteristics and relative positions. Warm, connected, meaningful wall-art gift.',
    scenes: [
      'The whole family sits together on a sofa in a sunlit living room, close and relaxed.',
      'The whole family walks together along a calm Mediterranean beach at golden hour.',
      'The whole family enjoys a picnic on a blanket under a large tree in a green park.',
      'The whole family gathers around a festive dinner table with warm candlelight.',
    ],
  },
  animated: {
    name: 'Premium 3D animated feature film',
    styleLock:
      'Charming premium 3D animated feature-film character rendering. Expressive but believable eyes, appealing character proportions, beautifully detailed textures, soft cinematic lighting, vibrant yet harmonious colors, depth of field and a magical atmosphere, like a polished frame from a major animated movie.',
    scenes: [
      'The subject explores an enchanted forest full of glowing fireflies.',
      'The subject rides a bicycle through a sunny Mediterranean seaside town.',
      'The subject builds a snowman in a cozy snowy village at dusk.',
      'The subject floats above the clouds under a magical starry night sky.',
    ],
  },
};

export function hasStylePrompt(styleId: string): boolean {
  return styleId in STYLES;
}

export function variationCount(): number {
  return 4;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (m, name: string) => values[name] ?? m);
}

export function buildPrompt(styleId: string, variation: number): string {
  const style = STYLES[styleId];
  if (!style) throw new Error(`unknown style ${styleId}`);
  const n = variation % 4;
  const scene = style.scenes[n];
  return [
    fill(COLLECTION_PROMPT, { aspect_ratio: ASPECT_RATIO, style_name: style.name, scene_description: scene }),
    `IMAGE ${n + 1}\nSTYLE LOCK:\n${style.styleLock}`,
    `SCENE ${n + 1}:\n${scene}`,
    IMAGE_CLOSING,
  ].join('\n\n');
}

/** The approved style reference image for a style, if one is set. */
export function styleReference(styleId: string): string | undefined {
  return STYLES[styleId]?.reference;
}

/** For tests: every style id with a prompt. */
export const PROMPT_STYLE_IDS = Object.keys(STYLES);
