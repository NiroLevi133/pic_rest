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

  // From the owner, verbatim.
  'pet-life': {
    name: 'Humorous luxury lifestyle photography',
    stylePrompt: `Create a cohesive collection of four humorous, ultra-photorealistic lifestyle portraits featuring the exact same subject from the uploaded reference image.

IDENTITY PRESERVATION:
Use the uploaded original photograph as the primary identity reference. Preserve the subject's exact recognizable facial features, proportions, eye color, hairstyle, skin tone, fur colors, breed, markings, and distinctive characteristics where applicable.

CREATIVE DIRECTION:
Portray the subject in funny, human-like everyday situations while maintaining its recognizable identity and believable anatomy.

VISUAL STYLE LOCK:
Premium editorial lifestyle photography.
Warm beige, ivory, cream, soft brown, and subtle sage-green tones.
Soft natural window lighting, realistic textures, sophisticated interior design, and subtle cinematic depth of field.

COLLECTION CONSISTENCY:
All four images must look like they were photographed during the same professional photoshoot.
Maintain consistent color grading, lighting quality, photographic realism, subject identity, and overall aesthetic.

SCENE VARIATION:
Each artwork must show the same subject performing a different humorous activity in a distinct environment.

OUTPUT RULES:
Generate exactly ONE standalone image per request.
Aspect ratio: {{aspect_ratio}}.
High-resolution, print-ready composition.
Keep the subject comfortably within safe margins for printing.

No collages, grids, frames, mockups, text, logos, signatures, or watermarks.

Avoid cartoon styling, inconsistent faces, altered fur patterns, extra limbs, distorted anatomy, and additional subjects.`,
    scenes: [
      {
        title: 'LUXURY SPA DAY',
        prompt:
          'Create an ultra-photorealistic portrait of the subject relaxing in a luxurious spa bathroom. The subject wears a soft white bathrobe with a neatly wrapped towel on the head, looking calm, pampered, and slightly amusing. Include elegant beige stone surfaces, soft white towels, subtle spa accessories, and warm natural lighting. Preserve the exact recognizable identity, facial features, and realistic anatomy of the original subject. Premium editorial lifestyle photography with sophisticated warm neutral color grading.',
      },
      {
        title: 'BUBBLE BATH',
        prompt:
          "Depict the exact same subject enjoying a luxurious bubble bath in a stylish freestanding bathtub. Surround the subject with fluffy white soap bubbles, warm cream-colored bathroom tiles, and elegant bath accessories. The subject's face must remain clearly visible and recognizable, with a relaxed and humorous expression. Maintain the same realistic photographic treatment, soft natural lighting, beige-and-ivory palette, and consistent identity as the other images.",
      },
      {
        title: 'MORNING COFFEE',
        prompt:
          "Show the exact same subject sitting comfortably at a beautiful minimalist kitchen table with a cup of morning coffee. Include a ceramic coffee mug, subtle breakfast details, warm sunlight entering through a nearby window, and a stylish beige-and-cream kitchen interior. The subject looks relaxed, confident, and amusingly human-like. Preserve the original subject's recognizable identity and believable anatomy. Premium photorealistic editorial lifestyle photography.",
      },
      {
        title: 'BATHROOM NEWSPAPER',
        prompt:
          "Create a humorous ultra-photorealistic portrait of the exact same subject sitting on a modern toilet in a stylish beige bathroom while reading an open newspaper. The subject looks surprisingly serious and focused, creating a funny human-like moment. Include elegant neutral bathroom tiles, soft natural window lighting, and realistic photographic textures. Preserve the subject's exact recognizable identity, facial features, fur markings or hairstyle, and believable anatomy. No readable newspaper text, no cartoon styling.",
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

  // From the owner, verbatim.
  'tel-aviv': {
    name: 'Humorous Tel Aviv lifestyle editorial photography',
    stylePrompt: `Create a cohesive four-piece humorous Tel Aviv lifestyle art collection featuring the exact same subject from the uploaded reference photograph.

IDENTITY LOCK:
Use the original photograph as the primary identity reference. Preserve the subject's recognizable face, facial structure, eyes, hairstyle, skin tone, or fur color and markings. Keep the same person or pet in every artwork.

CREATIVE DIRECTION:
Trendy 26-year-old Tel Aviv lifestyle, matcha obsession, boutique reformer Pilates, stylish brunch cafés, beach culture, effortless street fashion, and playful Gen Z humor.

VISUAL STYLE LOCK:
Ultra-photorealistic editorial lifestyle photography with a subtle playful, satirical twist.

Color palette: matcha green, butter yellow, baby pink, warm ivory, oat milk beige, and soft Mediterranean blue.

Natural Mediterranean sunlight, subtle film grain, soft shadows, candid poses, tasteful vintage digital-camera aesthetic, and premium Pinterest-inspired art direction.

CHARACTER:
The subject is the main character in every scene. If the subject is an animal, portray it naturally participating in human lifestyle activities while preserving its recognizable animal face and anatomy. If human, preserve realistic facial identity and body proportions.

COLLECTION CONSISTENCY:
All four images must share the same photographic treatment, lighting quality, color grading, and playful Tel Aviv aesthetic. Each scene must be visually distinct.

OUTPUT:
Create exactly ONE standalone artwork per generation.
Aspect ratio: {{aspect_ratio}}.
Premium print-ready composition with safe margins.
No collages, frames, mockups, typography, logos, or watermarks.`,
    scenes: [
      {
        title: 'MATCHA MORNING',
        prompt:
          "Depict the exact same subject at a trendy Tel Aviv sidewalk café, enjoying an oversized iced matcha latte in a clear glass. Add stylish sunglasses, a tiny café table, warm morning sunlight, and an effortlessly fashionable atmosphere. Matcha green and warm cream tones dominate. Humorous but believable, candid premium editorial photography. Preserve the original subject's exact recognizable identity.",
      },
      {
        title: 'PILATES PRINCESS',
        prompt:
          'Depict the same subject exercising on a realistic Pilates reformer machine inside a beautiful boutique Pilates studio in Tel Aviv. Include pastel workout accessories, grip socks, soft pink and beige interiors, large windows, and natural morning sunlight. The subject looks adorably serious about the workout. If the subject is a pet, adapt the pose playfully while maintaining recognizable animal anatomy. Ultra-photorealistic editorial lifestyle photography.',
      },
      {
        title: "BRUNCH O'CLOCK",
        prompt:
          "Show the same subject enjoying a fashionable Friday brunch at a charming Tel Aviv sidewalk café. Include a golden croissant, iced coffee, a minimalist ceramic plate, sunglasses, and a relaxed city-street atmosphere. Capture a spontaneous candid moment with warm sunlight, subtle film grain, stylish neutral colors, and playful humor. Keep the subject's identity completely recognizable.",
      },
      {
        title: 'GORDON BEACH CLUB',
        prompt:
          'Portray the same subject relaxing on a chic striped beach chair at a Mediterranean Tel Aviv beach. Include stylish sunglasses, a pastel beach umbrella, turquoise sea, warm sand, and beautiful summer sunlight. The subject looks effortlessly cool and completely unbothered. Preserve recognizable identity and realistic anatomy. Premium playful editorial photography with consistent pastel color grading.',
      },
    ],
  },

  // From the owner, verbatim.
  family: {
    name: 'Playful contemporary illustrated family portrait',
    stylePrompt: `Create a cohesive collection of four playful, contemporary illustrated family portraits based on the uploaded reference image.

IDENTITY LOCK:
Use the uploaded photograph as the primary identity reference. Preserve the exact number of people and pets, recognizable facial features, hairstyles, skin tones, body proportions, pet breeds, fur markings, and distinctive characteristics.

ARTISTIC STYLE:
Trendy contemporary editorial illustration for stylish young adults aged 25–35.

Expressive hand-drawn characters, slightly exaggerated gestures, charming facial expressions, organic shapes, subtle paper grain, soft textured brushwork, and sophisticated flat-color shading.

COLOR PALETTE:
Butter yellow, tomato red, pastel pink, sage green, sky blue, warm cream, and muted terracotta.

HUMOR:
Playful, relatable everyday situations with subtle Israeli lifestyle humor. Natural, spontaneous interactions and funny visual details.

STYLE CONSISTENCY:
All four artworks must look like they belong to the same illustrated art collection. Maintain identical character design, drawing technique, line thickness, color palette, texture, and overall visual treatment.

SCENE VARIATION:
Each image shows the exact same family in a different humorous everyday situation.

OUTPUT:
Generate exactly ONE standalone illustration per request.
Aspect ratio: {{aspect_ratio}}.
Premium print-ready composition.
No frames, mockups, collages, text, logos, signatures, or watermarks.

Avoid generic faces, missing family members, additional people, distorted anatomy, childish cartoon proportions, or inconsistent character design.`,
    scenes: [
      {
        title: 'CHAOTIC MORNING',
        prompt:
          'Illustrate the exact same family from the reference photo in a funny, chaotic morning scene inside a trendy Israeli apartment. Everyone is wearing comfortable pajamas, with messy morning hair and sleepy expressions. Include coffee cups, breakfast dishes, a slightly messy kitchen, and playful interactions. If a pet is present, show it stealing attention or causing harmless mischief. Keep the original number of people and pets. Contemporary editorial illustration, sophisticated pastel colors, charming humor, and recognizable faces.',
      },
      {
        title: 'GROCERY SHOPPING CHAOS',
        prompt:
          'Illustrate the exact same family from the reference image during a humorous supermarket shopping trip. Show an overflowing shopping cart filled with groceries, exaggerated but believable reactions, and playful everyday chaos. Include the family pet only if present in the original image, positioned safely and naturally. Maintain the same recognizable faces, character designs, clothing aesthetic, illustration style, linework, and color palette as the first artwork. No additional people.',
      },
      {
        title: 'COUCH POTATO FAMILY',
        prompt:
          'Illustrate the exact same family enjoying a funny, lazy evening together on a cozy sofa in a modern apartment. Include pizza boxes, snacks, blankets, a television glow, and relaxed exaggerated expressions. If a pet is present, show it humorously occupying the best spot on the sofa. Create a warm, relatable composition with playful interactions, identical character designs, consistent pastel colors, and refined editorial illustration textures.',
      },
      {
        title: 'FAMILY BEACH DAY',
        prompt:
          "Illustrate the exact same family enjoying a slightly chaotic Mediterranean beach day in Tel Aviv. Include colorful beach towels, a striped umbrella, watermelon slices, beach bags, and playful summer details. Show natural humorous interactions, wind-blown hair, and expressive poses. Preserve every family member's recognizable identity and consistent character design. Use the same sophisticated editorial illustration style, pastel color palette, and textured hand-drawn appearance as the other artworks.",
      },
    ],
  },

  // From the owner, verbatim.
  animated: {
    name: 'Premium 3D animated feature film',
    stylePrompt: `Create a cohesive collection of four premium 3D animated feature-film artworks featuring the exact same subject from the uploaded reference photograph.

IDENTITY LOCK:
Use the original uploaded photograph as the primary identity reference. Preserve the subject's recognizable facial structure, eye color, hairstyle, skin tone, fur colors, distinctive markings, and unique physical characteristics.

CHARACTER DESIGN:
Transform the subject into a charming, expressive, high-end 3D animated movie character.

Use appealing stylized proportions, expressive eyes, believable anatomy, detailed hair or fur grooming, sophisticated material shaders, and natural facial expressions.

The character must remain immediately recognizable as the original subject, rather than becoming a generic animated character.

STYLE LOCK:
Premium cinematic 3D animation with polished rendering, soft global illumination, beautiful volumetric lighting, detailed environments, subtle depth of field, and rich but harmonious colors.

COLOR PALETTE:
Warm golden highlights, teal-blue shadows, soft lavender, emerald green, and vibrant cinematic accents.

COLLECTION CONSISTENCY:
All four images must use the exact same character design, facial proportions, eye shape, hairstyle or fur pattern, outfit design, rendering technique, and overall cinematic quality.

SCENE VARIATION:
Each artwork depicts the same character in a different cinematic moment, forming a connected visual adventure.

OUTPUT:
Generate exactly ONE standalone image per request.
Aspect ratio: {{aspect_ratio}}.
High-resolution, print-ready composition.
Keep important character details within safe print margins.

No collages, grids, frames, mockups, typography, logos, signatures, or watermarks.

Avoid inconsistent faces, extra limbs, distorted anatomy, generic character designs, or changes to the subject's recognizable identity.`,
    scenes: [
      {
        title: 'THE MAIN CHARACTER',
        prompt:
          "Create a cinematic hero portrait of the subject as a charming premium 3D animated feature-film character. The character stands confidently in a beautifully lit environment with a playful, expressive face and subtle heroic pose. Use dramatic but friendly golden and teal cinematic lighting, soft depth of field, detailed fur or hair, and sophisticated animated-film rendering. Establish a consistent character design that will be reused across the entire collection. Preserve the original subject's recognizable identity.",
      },
      {
        title: 'THE ADVENTURE BEGINS',
        prompt:
          'Depict the exact same animated character exploring an enchanting magical forest filled with softly glowing plants, whimsical mushrooms, floating fireflies, and mysterious pathways. The character looks curious and excited, as if discovering a new world. Preserve identical facial proportions, eye shape, hairstyle or fur markings, character design, and outfit. Use premium cinematic 3D rendering with magical volumetric lighting, emerald and teal tones, and warm golden highlights.',
      },
      {
        title: 'THE FANTASY WORLD',
        prompt:
          'Show the same animated character standing before a magnificent whimsical fantasy castle surrounded by colorful landscapes, magical clouds, and charming architectural details. The character looks amazed and delighted. Maintain the exact same recognizable character identity, outfit, facial design, rendering technique, and cinematic lighting style. Use a rich but harmonious palette of lavender, emerald, warm gold, and sky blue. Create a polished animated feature-film composition.',
      },
      {
        title: 'THE FAIRY-TALE ENDING',
        prompt:
          'Create a heartwarming cinematic finale featuring the exact same animated character standing triumphantly on a beautiful hilltop at golden sunset. The character displays a joyful, slightly humorous expression, celebrating the end of an unforgettable adventure. Include soft glowing clouds, subtle magical particles, and a breathtaking warm sky. Maintain consistent character design, recognizable identity, costume, proportions, and premium 3D animated-film rendering. The atmosphere should feel magical, emotional, and uplifting.',
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
