/**
 * Image prompts for the store. Server-only: never sent to the browser.
 *
 * Every upload makes a 4-piece collection. Each of the 4 images is sent, in this order:
 *   1. COLLECTION_PROMPT — the same for every style and image ({{style_name}}, {{scene_description}}, {{aspect_ratio}} filled in)
 *   2. STYLE PROMPT      — the style's own prompt, the same for all 4 images of that style ({{aspect_ratio}} filled in)
 *   3. SCENE n           — the style's prompt for this one image, different for each of the 4
 *   4. IMAGE_CLOSING     — the same for every image
 *
 * A style may have an approved style reference image (`reference`): it is sent as a second image,
 * after the customer's photo, and the prompt tells the model it defines only the visual treatment.
 */

interface Scene {
  /** e.g. 'THE ROYAL PORTRAIT', shown as "SCENE 1 — THE ROYAL PORTRAIT" */
  title: string;
  prompt: string;
}

interface CollectionStyle {
  /** English name, filled into {{style_name}} */
  name: string;
  /** The style's prompt for all 4 images together. May use {{aspect_ratio}}. */
  stylePrompt: string;
  /** One prompt per image. */
  scenes: [Scene, Scene, Scene, Scene];
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
  royal: {
    name: 'Renaissance royal oil painting',
    stylePrompt: `Create a museum-quality Renaissance oil painting as part of a cohesive four-piece royal portrait collection.

IDENTITY PRESERVATION:
Use the uploaded original photograph as the primary identity reference. Preserve the subject's exact recognizable facial features, facial structure, eye color, fur color and markings, hairstyle, skin tone, and distinctive characteristics where applicable.

ROYAL CHARACTER:
Portray the subject as a noble royal figure with an elegant and dignified presence. Maintain the same royal identity, crown design, clothing palette, and overall character appearance throughout the collection.

ARTISTIC STYLE LOCK:
Authentic 17th-century European aristocratic oil painting.
Rich burgundy velvet, antique gold embroidery, deep emerald accents, and dark warm-brown backgrounds.
Dramatic chiaroscuro lighting, subtle aged-canvas texture, refined oil brushstrokes, realistic proportions, and exquisite historical detailing.

COLLECTION CONSISTENCY:
All four artworks must appear to have been painted by the same historical portrait artist. Maintain consistent lighting direction, brushwork, color grading, royal costume design, and visual mood.

OUTPUT RULES:
Generate exactly ONE standalone painting for the requested scene.
Aspect ratio: {{aspect_ratio}}.
Centered, elegant composition with safe margins for printing.
No modern objects, no cartoon styling, no text, logos, watermarks, borders, frames, or collages.`,
    scenes: [
      {
        title: 'THE ROYAL PORTRAIT',
        prompt:
          'Create a formal waist-up royal portrait of the subject, facing slightly toward the viewer. The subject wears an ornate antique-gold crown and luxurious burgundy velvet robes with intricate gold embroidery. Use a dark classical studio background and dramatic soft side lighting. The face must be clearly visible and faithfully match the uploaded reference image. Elegant, symmetrical, dignified composition.',
      },
      {
        title: 'THE ROYAL THRONE',
        prompt:
          'Depict the exact same royal character seated majestically on an elaborate antique-gold throne with carved details and burgundy velvet upholstery. Maintain the same crown, clothing colors, facial identity, and historical oil-painting style established in the first artwork. Show a wider composition with rich palace drapery and warm dramatic lighting. The subject remains the central focus.',
      },
      {
        title: 'THE PALACE',
        prompt:
          'Portray the same royal character standing inside a grand historical palace corridor with marble columns, classical paintings, and elegant architectural details. Maintain the same royal identity, crown design, burgundy-and-gold costume, and consistent painterly treatment. Use a three-quarter-length composition and warm light entering from tall palace windows. Preserve accurate recognizable facial features.',
      },
      {
        title: 'THE ROYAL GARDEN',
        prompt:
          'Create an elegant royal oil painting of the same character standing in a formal European palace garden. Include classical stone fountains, manicured hedges, and subtle architectural elements in the background. Preserve the identical royal costume, crown, facial identity, and oil-painting technique. Use warm late-afternoon light with the same rich color palette and refined aristocratic atmosphere. Keep the character visually dominant.',
      },
    ],
  },

  // Scenes and the style lock line are the owner's; the rest of the style prompt is a draft in the royal structure.
  'pet-life': {
    name: 'Humorous luxury lifestyle photography',
    stylePrompt: `Create an ultra-photorealistic humorous luxury lifestyle photograph as part of a cohesive four-piece "secret life" pet collection.

IDENTITY PRESERVATION:
Use the uploaded original photograph as the primary identity reference. Preserve the pet's exact breed, facial structure, eye color, fur color, fur length and markings, ear shape, and distinctive characteristics.

CHARACTER:
Portray the pet as a relaxed, self-assured character enjoying a pampered human lifestyle, with natural animal anatomy and a subtly funny, deadpan expression. Maintain the same character appearance throughout the collection.

ARTISTIC STYLE LOCK:
Ultra-photorealistic humorous luxury lifestyle photography. Warm beige and cream palette, soft editorial lighting, realistic fur and skin textures, sophisticated bathroom and home interiors.

COLLECTION CONSISTENCY:
All four images must look like one editorial photo shoot by the same photographer. Maintain consistent lighting, color grading, lens look, interior design language, and visual mood.

OUTPUT RULES:
Generate exactly ONE standalone photograph for the requested scene.
Aspect ratio: {{aspect_ratio}}.
Centered composition with safe margins for printing.
No cartoon styling, no text, logos, watermarks, borders, frames, or collages.`,
    scenes: [
      {
        title: 'THE SPA',
        prompt: 'The subject is relaxing in a luxurious spa wearing a white bathrobe and a towel on the head.',
      },
      {
        title: 'THE BUBBLE BATH',
        prompt: 'The subject is enjoying a bubble bath in a stylish bathtub with elegant bath accessories.',
      },
      {
        title: 'MORNING COFFEE',
        prompt:
          'The subject is sitting at a beautiful kitchen table with a cup of coffee and a relaxed morning atmosphere.',
      },
      {
        title: 'THE MORNING PAPER',
        prompt: 'The subject is sitting comfortably in a stylish bathroom reading a newspaper.',
      },
    ],
  },

  // From the owner, verbatim.
  minimal: {
    name: 'Minimalist watercolor fine-art portrait',
    stylePrompt: `Create a cohesive collection of four elegant, minimalist watercolor artworks featuring the same subject from the uploaded reference image.

IDENTITY PRESERVATION:
Use the original uploaded photograph as the authoritative identity reference. Preserve the subject's recognizable facial features, proportions, expression, hairstyle, fur colors, markings, eye color, and distinctive details.

ARTISTIC STYLE LOCK:
Delicate hand-painted watercolor on premium textured ivory paper.
Soft pastel washes, warm beige and cream tones, muted sage green, subtle dusty rose accents, and gentle natural shading.
Refined organic brushstrokes, translucent pigment layers, soft feathered edges, and generous negative space.

COLLECTION CONSISTENCY:
All four artworks must appear to be painted by the same watercolor artist, using identical artistic techniques, paper texture, color palette, softness, and level of detail.

SCENE VARIATION:
Each image depicts the same subject in a different setting or pose, while maintaining the same recognizable identity and consistent visual language.

OUTPUT RULES:
Generate exactly ONE standalone artwork per request.
Aspect ratio: {{aspect_ratio}}.
Keep the subject comfortably within print-safe margins.
No frames, mockups, collages, typography, logos, signatures, or watermarks.
Premium gallery-quality watercolor artwork.`,
    scenes: [
      {
        title: 'CLASSIC WATERCOLOR PORTRAIT',
        prompt:
          'Create a refined close-up watercolor portrait of the subject, facing slightly toward the viewer. Use a minimal warm ivory background, subtle watercolor pigment variations, and generous negative space. Focus on accurate recognizable facial features and gentle natural expression. Soft brushwork and delicate shadows. The subject should be the clear focal point.',
      },
      {
        title: 'BOTANICAL PORTRAIT',
        prompt:
          'Depict the exact same subject surrounded by delicate botanical flowers and soft greenery. Include muted blush-pink blossoms, sage-green leaves, and subtle watercolor botanical details. Maintain the same face, fur or hair characteristics, painting technique, and warm ivory paper texture. The flowers should frame the subject naturally without obscuring important facial details.',
      },
      {
        title: 'PEACEFUL MOMENT',
        prompt:
          'Portray the same subject resting peacefully in a relaxed, natural pose. Use a soft cream-colored cushion or subtle neutral fabric, delicate warm shadows, and an uncluttered ivory background. Maintain consistent watercolor brushwork, translucent pigment layers, recognizable identity, and gentle pastel color palette. Create a calm, intimate, timeless atmosphere.',
      },
      {
        title: 'GOLDEN SUNLIGHT',
        prompt:
          'Create a delicate watercolor portrait of the same subject sitting beside a softly illuminated window. Gentle golden sunlight falls naturally across the face and body, creating subtle warm highlights and feathered watercolor shadows. Keep the background minimal, with ivory paper texture and muted beige tones. Maintain the exact same artistic treatment and recognizable identity as the other artworks.',
      },
    ],
  },

  // Drafts in the royal structure — review and replace freely.
  family: {
    name: 'Contemporary hand-painted family portrait',
    stylePrompt: `Create a sophisticated contemporary hand-painted family portrait as part of a cohesive four-piece family collection.

IDENTITY PRESERVATION:
Use the uploaded original photograph as the primary identity reference. Keep the exact number of people and pets, their recognizable faces, hairstyles, skin tones, body proportions, clothing characteristics, and relative positions.

FAMILY CHARACTER:
Portray the family as warm, connected, and at ease together. Every family member must appear in every artwork, with the same appearance throughout the collection.

ARTISTIC STYLE LOCK:
Contemporary hand-painted illustration.
Warm neutral colors, delicate textures, soft natural lighting.
A warm, meaningful wall-art gift.

COLLECTION CONSISTENCY:
All four artworks must appear to have been painted by the same artist. Maintain consistent brushwork, palette, lighting mood, and character rendering.

OUTPUT RULES:
Generate exactly ONE standalone artwork for the requested scene.
Aspect ratio: {{aspect_ratio}}.
Balanced composition with every face clearly visible and safe margins for printing.
No missing or extra people or pets, no text, logos, watermarks, borders, frames, or collages.`,
    scenes: [
      {
        title: 'THE LIVING ROOM',
        prompt: 'The whole family sits together on a sofa in a sunlit living room, close and relaxed.',
      },
      {
        title: 'THE BEACH',
        prompt: 'The whole family walks together along a calm Mediterranean beach at golden hour.',
      },
      {
        title: 'THE PICNIC',
        prompt: 'The whole family enjoys a picnic on a blanket under a large tree in a green park.',
      },
      {
        title: 'THE FESTIVE DINNER',
        prompt: 'The whole family gathers around a festive dinner table with warm candlelight.',
      },
    ],
  },
  animated: {
    name: 'Premium 3D animated feature film',
    stylePrompt: `Create a charming premium 3D animated feature-film frame as part of a cohesive four-piece animated collection.

IDENTITY PRESERVATION:
Use the uploaded original photograph as the primary identity reference. Preserve the subject's recognizable facial features, eye color, fur color and markings, hairstyle, skin tone, and distinctive characteristics, translated into an appealing animated character.

CHARACTER:
Portray the subject as a lovable lead character of an animated movie, with expressive but believable eyes and appealing proportions. Maintain the same character design and outfit throughout the collection.

ARTISTIC STYLE LOCK:
Premium 3D animated feature-film rendering.
Beautifully detailed textures, soft cinematic lighting, vibrant yet harmonious colors.
Depth of field and a magical atmosphere, like a polished frame from a major animated movie.

COLLECTION CONSISTENCY:
All four images must look like frames from the same movie. Maintain consistent character design, rendering quality, color grading, and mood.

OUTPUT RULES:
Generate exactly ONE standalone image for the requested scene.
Aspect ratio: {{aspect_ratio}}.
The character is the clear focal point, with safe margins for printing.
No text, logos, watermarks, borders, frames, or collages.`,
    scenes: [
      {
        title: 'THE ENCHANTED FOREST',
        prompt: 'The subject explores an enchanted forest full of glowing fireflies.',
      },
      {
        title: 'THE SEASIDE TOWN',
        prompt: 'The subject rides a bicycle through a sunny Mediterranean seaside town.',
      },
      {
        title: 'THE SNOWY VILLAGE',
        prompt: 'The subject builds a snowman in a cozy snowy village at dusk.',
      },
      {
        title: 'ABOVE THE CLOUDS',
        prompt: 'The subject floats above the clouds under a magical starry night sky.',
      },
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
    fill(COLLECTION_PROMPT, { aspect_ratio: ASPECT_RATIO, style_name: style.name, scene_description: scene.prompt }),
    fill(style.stylePrompt, { aspect_ratio: ASPECT_RATIO }),
    `SCENE ${n + 1} — ${scene.title}\n${scene.prompt}`,
    IMAGE_CLOSING,
  ].join('\n\n');
}

/** The approved style reference image for a style, if one is set. */
export function styleReference(styleId: string): string | undefined {
  return STYLES[styleId]?.reference;
}

/** For tests: every style id with a prompt. */
export const PROMPT_STYLE_IDS = Object.keys(STYLES);
