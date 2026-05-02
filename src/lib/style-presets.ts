/**
 * Style presets for restaurant photography.
 * Each preset has a key, display name, description, and a full image generation prompt.
 * Add new presets here – they appear automatically in the UI.
 */

export interface StylePreset {
  key: string;
  label: string;
  description: string;
  emoji: string;
  color: string;
  prompt: string;
  comingSoon?: boolean; // kept for type compat
  isCustom?: boolean;   // user uploads a style reference image
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: 'atmosphere',
    label: 'תמונות אווירה',
    description: 'צילום lifestyle חי ועליז עם רקע אווירתי ותאורת יום טבעית',
    emoji: '☀️',
    color: 'orange',
    prompt: `# ROLE & GOAL
You are a professional Food AI Photography Agent for a premium restaurant image upgrade system. Your goal is to transform a real, often imperfect, mobile photo of a dish provided by a restaurant owner into a vibrant, high-end commercial lifestyle photograph for menus, social media, and marketing materials.

# MANDATORY STYLE & COMPOSITION:

1. Environment:
Place the EXACT original dish on a high-quality Mediterranean-style surface or subtle textured tablecloth.
The background must fully fill the frame edge-to-edge.
No visible restaurant environment, no depth layers, no distant background.
Use a clean, tasteful, slightly colorful or neutral surface (NOT black, NOT dark studio).

2. Lighting:
Bright, soft natural daylight.
Warm, inviting tones with soft shadows.
Colors should be vibrant but natural and balanced (not oversaturated).

3. Camera Angle:
Perfect true 90-degree top-down (flat lay).
The plate must be precisely centered with symmetrical alignment.

4. Framing & Composition:
The plate must occupy approximately 70–85% of the frame.
The entire plate must be fully visible and completely inside the frame.
Maintain small, even margins around the plate (no tight cropping, no excessive empty space).
The plate must not touch the edges of the frame.
Avoid zooming out too much — use a medium-close top-down composition.
The frame should feel full, balanced, and intentional.

5. Photography Style:
Clean, professional, minimalistic food photography.
Flat lay composition only.
Full sharp focus across the entire dish (deep focus).
No blur, no bokeh, no environmental background.

6. Background Rules:
Background must be clean, continuous, and aesthetically pleasing.
No people, no restaurant interior, no additional scene elements.
No depth or layered background — surface only.

7. Quality:
4K resolution, ultra photorealistic, maximum sharpness.

# MANDATORY DISH PRESERVATION RULES (STRICTLY FORBIDDEN TO CHANGE):
1. Ingredients: Keep the EXACT ingredients from the original reference photo.
2. Additions: DO NOT add any ingredients, sauces, props, or garnishes not present in the original.
3. Removals: DO NOT remove any elements or change the dish type, recipe, or structure.
4. Recognition: The viewer MUST instantly recognize this as the exact same dish from the user's photo.

# WHAT MAY BE ENHANCED (VISUAL ONLY):
1. Texture: Make ingredients look fresher, crispier, juicier, and more alive.
2. Presentation: Clean and slightly improve the plating and arrangement of the original elements.
3. Colors: Enhance natural colors without artificial exaggeration.

# FORBIDDEN (ABSOLUTELY NO DEVIATIONS):
1. DO NOT change the dish to a different version or interpretation.
2. DO NOT make the dish look like another type of food.
3. DO NOT add text, logos, watermarks, or people.
4. DO NOT allow AI artifacts, a painting-like appearance, or a plastic look.

# FINAL OUTPUT
Produce a hyper-realistic, appetizing, professional commercial photograph.`,
  },
  {
    key: 'studio',
    label: 'סטודיו',
    description: 'צילום סטודיו מקצועי על רקע נקי עם תאורה מבוקרת',
    emoji: '🎬',
    color: 'blue',
    prompt: `# ROLE & GOAL
You are a master of Fine Dining Food AI Photography for a premium restaurant image upgrade system. Your goal is to transform a real, often imperfect, mobile photo of a dish provided by a restaurant owner into a high-end, luxury 4K studio photograph suitable for premium menus and sophisticated marketing materials.

# MANDATORY STYLE & COMPOSITION:

1. Environment:
Place the EXACT original dish on a premium dark studio surface such as matte black marble, dark slate, or deep charcoal stone.
The background must fully fill the frame edge-to-edge.
Keep the environment clean, minimal, elegant, and distraction-free.
No additional elements, no props, no restaurant setting.

2. Lighting:
Use dramatic, controlled studio lighting (Chiaroscuro style).
Strong directional light to create refined highlights and deep, intentional shadows.
Emphasize texture, freshness, and premium quality.
Lighting must feel precise, sharp, and high-end.

3. Camera Angle:
Perfect true 90-degree top-down (flat lay).
The plate must be precisely centered with symmetrical alignment.

4. Framing & Composition:
The plate must occupy approximately 70–85% of the frame.
The entire plate must be fully visible and completely inside the frame.
Maintain small, even margins around the plate (no tight cropping, no excessive empty space).
The plate must not touch the edges of the frame.
Use a medium-close top-down composition (not zoomed out, not too tight).
The frame should feel full, balanced, and intentional.

5. Photography Style:
Luxury, minimalist fine dining studio photography.
Flat lay composition only.
Full sharp focus across the entire dish (deep focus).
High contrast, crisp, and precise rendering.
No blur, no bokeh, no environmental background.

6. Background Rules:
Background must be dark, continuous, and uniform.
No depth layers, no visible environment beyond the surface.
No people, no props, no clutter.

7. Quality:
4K resolution, ultra photorealistic, maximum sharpness, premium commercial studio quality.

# MANDATORY DISH PRESERVATION RULES (STRICTLY FORBIDDEN TO CHANGE):

1. Ingredients:
Keep the EXACT ingredients from the original reference photo.

2. Additions:
DO NOT add any ingredients, sauces, props, or garnishes not present in the original.

3. Removals:
DO NOT remove any elements or change the dish type, recipe, or structure.

4. Recognition:
The viewer MUST instantly recognize this as the exact same dish from the user's photo.

# WHAT MAY BE ENHANCED (VISUAL ONLY):

1. Texture:
Make ingredients look fresher, crispier, juicier, and more visually appealing (e.g., glistening sauces, vibrant herbs).

2. Presentation:
Clean and slightly improve the plating and arrangement of the original elements for a professional "plated" look.

3. Colors:
Enhance natural colors and contrast to stand out against the dark background without artificial exaggeration.

# FORBIDDEN (ABSOLUTELY NO DEVIATIONS):

1. DO NOT change the dish to a different version or interpretation.
2. DO NOT make the dish look like another type of food.
3. DO NOT add text, logos, watermarks, or people.
4. DO NOT create AI artifacts, painterly effects, or a plastic/artificial look.

# FINAL OUTPUT
Produce a hyper-realistic, sophisticated, appetizing, and premium commercial studio photograph with a full dark background and perfectly centered composition.`,
  },
  {
    key: 'enhance',
    label: 'ויב מקום',
    description: 'אוכל בפוקוס עם אווירת המקום ברקע חד – lifestyle אמיתי',
    emoji: '🌿',
    color: 'purple',
    prompt: `# ROLE & GOAL
You are a professional food and lifestyle photographer specializing in restaurant and café atmosphere shots. Your goal is to upgrade a real photo taken at a venue — making the food look stunning and appetizing while also making the location itself look attractive, lively, and authentic — all in one single image.

# MANDATORY STYLE & COMPOSITION:

1. Camera Angle:
Shoot at approximately 45 degrees above the food — a diagonal angle that shows both the dish and the venue behind it.
NOT top-down. The background must be visible and prominent.
The food sits in the lower foreground of the frame; the venue/environment spreads naturally behind it.

2. Frame Split (50/50):
The lower half of the frame: the dish and the immediate table surface — sharp and detailed.
The upper half of the frame: the venue environment (café interior, garden, outdoor seating, people, furniture) — equally sharp and clear.
Both halves must be in full focus — no bokeh, no blur anywhere.

3. Background — Fully Sharp:
The background must be crisp and readable — café interior, garden, trees, furniture, and people must all be clearly visible.
Enhance the background colors and contrast: greens more vivid, natural light warmer and cleaner, atmosphere inviting.
Do NOT remove or blur people in the background — they are part of the atmosphere.

4. Lighting:
Warm, natural daylight throughout the entire image.
Improve contrast and sharpness across the full frame.
Remove cold color casts or flat lighting — make the overall atmosphere feel warm and welcoming.

5. Quality:
4K resolution, ultra photorealistic, maximum sharpness across every part of the image.

# MANDATORY DISH PRESERVATION RULES (STRICTLY FORBIDDEN TO CHANGE):
1. **Ingredients (Strict Preservation):** Keep the EXACT ingredients, portions, arrangement, and plating from the original photo.
2. **Additions:** DO NOT add any ingredient, garnish, prop, or cutlery not present in the original.
3. **Removals:** DO NOT remove any element of the dish or change its type, recipe, or structure.
4. **Recognition:** The dish must be instantly recognizable as the exact same dish from the original photo.

# WHAT MAY BE ENHANCED:
1. **The Dish:** Sharpen details, improve textures — make the food look fresher, crispier, and more appetizing.
2. **The Background:** Enhance colors, contrast, and brightness of the venue — make it look more attractive and real.
3. **Overall Lighting:** Improve the natural light across the entire image.

# FORBIDDEN (ABSOLUTELY NO DEVIATIONS):
1. DO NOT change the identity or ingredients of the dish.
2. DO NOT add elements that were not in the original photo.
3. DO NOT delete people, furniture, or background elements from the scene.
4. DO NOT allow AI artifacts, a painterly appearance, or a plastic/artificial look.
5. DO NOT apply bokeh or depth-of-field blur — everything must remain sharp.

# FINAL OUTPUT
A professional, authentic lifestyle photograph — the food sharp and appetizing in the foreground, the venue impressive and inviting in the background, everything in focus, warm, and full of atmosphere.`,
  },
  {
    key: 'crazy',
    label: 'סגנון משוגע',
    description: 'פיצוץ מרכיבים דרמטי, תנועה, אורות סינמטיים',
    emoji: '💥',
    color: 'red',
    prompt: `# ROLE

You are a world-class commercial food photographer specializing in high-speed freeze-motion photography for premium restaurant campaigns.

# GOAL

Transform the dish into a dramatic yet fully photorealistic freeze-motion shot — ingredients caught mid-air with natural physics, real textures, and studio-grade lighting. The result must look like an actual high-budget photo shoot, not AI-generated or CGI.

# COMPOSITION

- The dish sits in a premium bowl or plate at the bottom center of the frame
- A small number of key ingredients are lifted naturally above the dish (2–4 elements maximum)
- Motion is subtle and believable — a gentle toss, not an explosion
- Composition is clean, balanced, and intentional
- Clear focal point on the dish

# FOOD RULES

- Keep ALL original ingredients exactly as in the input photo
- DO NOT add ingredients that were not in the original
- DO NOT remove any element from the dish
- The dish must be instantly recognizable as the same dish

# MOTION & PHYSICS

- Ingredients float with realistic gravity — slight upward arc, natural rotation
- If sauce or liquid is present: small controlled splash with accurate fluid physics
- No exaggerated explosions or particle chaos
- Motion must feel captured at 1/8000s shutter speed — sharp, frozen, real

# LIGHTING

- Professional studio strobe lighting
- Single key light from top-left at 45 degrees
- Soft fill from the right to reduce harsh shadows
- Rim light behind the dish for depth separation
- No lens flare, no artificial glow

# BACKGROUND

- Deep matte black (#0D0D0D) — completely uniform, no gradients
- Zero distractions, no props, no surface texture visible

# CAMERA

- Slight elevated front angle (approximately 30–40 degrees above horizontal)
- NOT top-down
- 85mm–100mm equivalent focal length
- Full sharp focus on all elements (deep focus, f/8)
- No bokeh, no depth-of-field blur

# STYLE

- 100% photorealistic — must look like a real photograph
- No painterly effects, no AI artifacts, no plastic textures
- Every ingredient must have real, accurate texture (crispy, juicy, matte, glossy as appropriate)
- Commercial food photography grade

# QUALITY

- 4K ultra-sharp
- Maximum detail on every ingredient
- Accurate color temperature (neutral to warm, not oversaturated)

# NEGATIVE PROMPT

CGI look, cartoon, painting, over-saturated, too many floating elements, chaotic composition, blurry, low quality, AI artifacts, plastic food, distorted shapes, unrealistic physics`,
  },
  {
    key: 'floating',
    label: 'סגנון מעופף',
    description: 'קומפוזיציה מרחפת בסגנון פרסומות פרימיום עם שכבות מופרדות ורקע סטודיו',
    emoji: '🚀',
    color: 'sky',
    prompt: `# ROLE

You are a professional food retoucher and high-end commercial photographer.

# GOAL

Transform the provided dish image into a realistic floating composition, inspired by premium advertising style, while keeping the dish completely unchanged.

# INPUT IMAGE

Use the provided dish image as the ONLY reference.

# STRICT RULES

- Keep EXACT same ingredients and components as in the original image
- Do NOT add, remove, or redesign anything
- Preserve original structure, proportions, and textures

# COMPOSITION

- Create a floating (levitating) effect similar to high-end food ads
- Slightly separate the dish layers or components
- Separation must be subtle and physically realistic (gravity-aware, aligned)
- Keep everything perfectly centered and balanced

# BACKGROUND

- Clean studio gradient background (soft teal / light blue)
- Smooth and minimal
- Add a soft realistic shadow underneath the dish

# LIGHTING

- Match original lighting direction and enhance it
- Soft studio light (softbox from the side)
- Natural shadows and highlights
- No artificial glow

# STYLE

- Ultra photorealistic
- Must look like a real studio photo (NOT AI)
- High-end commercial food photography

# DETAILS

- Preserve all textures exactly
- Maintain natural imperfections
- No plastic or overprocessed look

# CAMERA

- Keep original angle and perspective
- Shallow depth of field
- DSLR quality, sharp but natural

# NEGATIVE

- No new ingredients
- No redesign of the dish
- No exaggerated floating
- No CGI or cartoon look`,
  },
  {
    key: 'drinks',
    label: 'שתייה',
    description: 'צילום משקאות פרימיום עם תאורת סטודיו, זכוכית ועיבוי',
    emoji: '🥂',
    color: 'cyan',
    prompt: `Transform the provided drink image into a high-end professional studio photograph while strictly preserving the original drink, glass shape, proportions, and composition.

Do not redesign or replace the drink — enhance it.

Enhancement goals:
- Improve lighting to a clean, controlled studio setup (soft side lighting + subtle backlight)
- Increase sharpness and micro-detail, especially on glass, liquid, and ice
- Enhance realism: accurate reflections, refraction, and transparency
- Add subtle realistic condensation droplets if the drink is cold
- Make ice cubes look crystal clear and well-defined
- Improve color accuracy and vibrancy while keeping it natural

If the drink is a cocktail:
- Refine garnish details (clean edges, elegant placement, realistic texture)
- Enhance liquid clarity and richness
- Emphasize premium, luxury bar presentation

If the drink is cold:
- Add realistic cold visual cues (condensation, slight fogging, freshness feel)

Background & composition:
- Replace background with a clean, minimal studio background (preferably dark or gradient)
- Optionally add a subtle reflective surface under the glass
- Keep the drink centered and isolated

Lighting:
- Cinematic studio lighting with soft highlights and controlled shadows
- Subtle rim light to define glass edges

Strict constraints:
- No new objects
- No floating elements
- No text, labels, logos, or decorations
- No change to drink type or ingredients
- No surreal or artificial look

Style:
Ultra-realistic, commercial beverage photography, premium brand quality, clean, elegant, minimalistic, 8K detail

Avoid:
cartoon, illustration, CGI look, plastic textures, over-editing`,
  },
  {
    key: 'butcher',
    label: 'נתח בודד',
    description: 'נתח בשר על בוצר, רקע שחור יוקרתי, תאורת סטודיו מחמיאה – מותאם לקצביות',
    emoji: '🥩',
    color: 'red',
    prompt: `Role & Goal: Act as a master food photographer for high-end commercial ads. Your goal is to transform the provided reference image into a 4K, hyper-realistic, luxurious photograph. The focus is on extreme photorealism and a clean, premium composition.

1. Subject & Rack Handling (STRICT RULES):

The Rack (CRITICAL SIZE): The subjects must be placed on a prominent black iron wire cooling rack. Crucially, the iron rack must be scaled up significantly to be much larger than the meat cuts, dominating the composition and making the meat appear relatively small on the vast grid. The grid pattern must be sharp and clearly visible.

The Meat (Calculated Enhancement): Maintain the EXACT shape, fibers, and structure of the beef cuts from the source. Enhance the raw meat with a calculated +30% 'richness' or vibrancy compared to its natural state. It should look exceptionally fresh, juicy, and premium, but absolutely not over-saturated or artificially "plastic." If there are multiple cuts, keep their relative sizes.

No Alterations: Do not add herbs, sauces, or garnishes. The meat must remain untouched. Remove any emojis or text from the source, leaving only the pristine beef on the rack.

Focus: Full-frame deep focus. The texture of the meat fibers and the metallic surface of the large iron rack must be perfectly sharp.

2. Composition & "Zoom-Out":

Perspective: Absolute 180-degree top-down view (Flat lay).

Framing (Airy and Spaced): Implement a significant zoom-out effect. The entire, vast black iron rack must be fully visible within the frame, with ample space (negative space) around it.

Mobile Layout: Due to the large rack size, the combined meat and rack should occupy about 70-80% of the vertical frame height, while the meat itself occupies only about 30-40%, providing a luxurious, airy, and premium mobile-story feel.

3. Environment & Details:

Background: The surface beneath the large iron rack must be luxurious, lighter-toned black marble with visible fine gray or white veining patterns.

The Bowl: Keep the small black bowl in its original position but change its contents to a simple, coarse mix of freshly ground black pepper and flaky sea salt.

Lighting: Professional studio lighting (Chiaroscuro). Subtle highlights on the calculated richness of the meat, the vast metallic surface of the rack, and the marble veining.

4. Execution:

Absolute photorealism. No logos, no text, no watermarks.

The final result must look like a raw, high-quality photograph, avoiding any "AI-generated" over-saturated or exaggerated look.`,
  },
  {
    key: 'skewers',
    label: 'שיפודים',
    description: 'שיפודי בשר גולמי על בוצר עץ, רקע שיש לבן, מתאים לקצביות',
    emoji: '🍢',
    color: 'red',
    prompt: `Role & Goal: Act as a master food photographer for high-end commercial product shots. Your goal is to transform the provided reference image of meat skewers into a pristine, high-resolution, luxurious culinary photograph for a generic ad campaign. The absolute focus must be on the specific meat skewers, the wooden board, and the marble background, with all other elements removed.

1. Subject Handling (STRICT RULES):

Preservation: Maintain the EXACT structure, identity, and raw state of the vertical rows of generic beef medallions on the skewers from the provided image. Do not change their form, number, or state.

No Alterations to Subject: Do not add seasoning, herbs, or garnishes to the meat or the board. The skewers must remain uncooked, raw beef.

Focus: Maintain an absolute, full-frame deep focus. Every fiber of the meat and grain of the wood must be perfectly sharp across the entire visual space.

2. Environment & Layout (CRITICAL DELETIONS):

Deletion 1: Completely remove any black bowl with salt and pepper if present.

Deletion 2: Completely remove any vintage carving fork or utensils if present.

Result: The expanded frame must consist only of the central wooden butcher block on the clean white marble surface, with the area previously occupied by the deleted items left clear and pristine.

3. Camera Angle & Composition (STRICT RULES):

Perspective: Perfect 180-degree top-down view (Flat lay).

Framing & Zoom-Out: Implement a significant zoom-out effect. The group of meat skewers on the board should occupy approximately 40-50% of the frame height, leaving substantial empty negative space of the light marble texture visible all around the board, creating a luxurious, airy, and premium feel. This frame is designed for vertical, mobile-friendly ads.

4. Textures & Colors (Enhancements allowed):

Primary Surfaces: The scene is set on the clean white marble background with fine gray veining. Extend and enhance this pattern.

Butcher Block: Place the meat and skewers directly on the dark, rich walnut wooden butcher block from the provided image. Intensify the rich wood grain texture.

Color & Contrast: Deepen natural red/pink tones and brighten white fat marbling for maximum visual contrast and palette appeal. The subject should glisten and appear vibrant.

5. Lighting:

Style: Professional, soft-focus natural studio lighting designed to flatter raw meat and highlight marble textures.

Effect: The light must emphasize the micro-texture and marbling, making the subject look fresh and juicy, while creating a soft-focus depth fall-off towards the periphery without harsh shadows.

6. Execution:

A seamless, flawless commercial product shot.

No text, logos, or watermarks.

No artificial, "plastic" or AI-generated textures. Absolute photorealism.`,
  },
  {
    key: 'marble',
    label: 'שיש לבן',
    description: 'צילום על שיש לבן יוקרתי עם תאורה עדינה',
    emoji: '🤍',
    color: 'white',
    prompt: `Role & Goal: Act as a master food photographer for high-end commercial ads. Your goal is to transform the provided reference image into a 4K resolution, hyper-realistic, luxurious culinary photograph. The focus is on extreme photorealism and a clean, premium composition for a mobile-ad format, strictly using only the meat subjects and the lighter marble background.

1. Subject Handling (STRICT RULES):

Identity: Identify and include ALL meat cuts present in the provided image. Maintain the EXACT shape, structure, and type of each raw beef cut.

Calculated Enhancement: Enhance the raw meat with a calculated and subtle +20% 'richness' or vibrancy compared to its original state. The meat must look naturally fresh and premium, with the deep red and white fat marbling colors gently intensified, but absolutely not over-saturated or artificially "plastic." The goal is a realistic, not exaggerated, improvement.

No Additions/Removals: Do NOT add any garnishes, herbs, sauces, or seasonings (no salt, no pepper). The scene is pristine and clean, consisting only of the meat cuts from the provided image.

State: Keep the EXACT identity, fibers, shape, and structure of each piece. Do NOT change its state (e.g., from raw to cooked). Do NOT remove fat, bones, or any natural elements.

Focus: Maintain an absolute, deep focus. Every fiber and detail of the meat and bone on all pieces must be sharp.

2. Camera Angle & Composition (STRICT RULES):

Perspective: Perfect 180-degree top-down view (Flat lay).

Framing & Zoom-Out (CRITICAL): Do NOT make a close-up or crop any part of the meat cuts. Implement a significant zoom-out effect. The group of meat cuts should occupy approximately 40-50% of the vertical frame height, leaving substantial empty negative space of the light marble texture visible all around the cuts.

No Crowding: Ensure the composition feels very 'airy' and uncrowded. Maintain the precise relative arrangement of the cuts as shown in the source within this expanded frame.

3. Environment & Texture (Enhancements allowed):

Background: The scene is set on the luxurious, textured lighter marble cutting board background. Enhance and intensify the intricate details of this texture to create a high-end, clean, and professional surface.

Background Extension: Extend the light marble texture to fill the entire vast expanded frame from edge to edge.

Color & Contrast: Deepen natural red/pink tones and brighten white fat marbling for maximum visual contrast. The subject should glisten with a natural moisture, appearing vibrant.

4. Lighting (CRITICAL CHANGE):

Style: Professional, soft-focus natural studio lighting. This light should be designed to flatter raw meat without creating harsh shadows or an overly dramatic "Chiaroscuro" effect.

Effect: The light must emphasize the micro-texture and marbling, making the subjects look naturally fresh and juicy, not stylized. The fall-off towards the periphery should be soft and gradual. The lighting should feel tailored to highlight the symmetry and composition.

5. Execution:

A seamless, flawless commercial product shot.

No text, logos, or watermarks.

No artificial, "plastic" or AI-generated textures. Absolute photorealism.`,
  },
  {
    key: 'custom',
    label: 'סגנון חופשי',
    description: 'העלה תמונת השראה וה-AI יאמץ את הסגנון',
    emoji: '🎨',
    color: 'pink',
    prompt: '', // generated dynamically from style reference image
    isCustom: true,
  },
];

/** Returns the preset prompt for a given key, or null if not found */
export function getPresetPrompt(key: string): string | null {
  const preset = STYLE_PRESETS.find(p => p.key === key);
  if (!preset || preset.comingSoon || !preset.prompt) return null;
  return preset.prompt;
}

/** Returns the preset for a given key, or null */
export function getPreset(key: string): StylePreset | null {
  return STYLE_PRESETS.find(p => p.key === key) ?? null;
}

/**
 * Returns a locked prompt for menu-series generation.
 * Every parameter is fixed — no "or", no options — so all dishes look identical.
 */
export function getMenuSeriesPrompt(styleKey: string): string {
  switch (styleKey) {
    case 'atmosphere':
      return `You are a professional food photographer producing images for a restaurant menu carousel.

═══════════════════════════════════════════════════════
⚠️  CAROUSEL SERIES — IDENTICAL FRAMING ACROSS ALL DISHES
═══════════════════════════════════════════════════════
These images will be placed side by side in an Instagram carousel.
The viewer swipes between dishes and must feel as if the camera NEVER MOVED.
The ONLY thing that changes between images is the food on the plate.
Everything else is physically fixed and cannot vary by a single pixel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FRAMING — ABSOLUTE FIXED RULE (NOT A GUIDELINE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Camera angle: perfectly perpendicular top-down, 90 degrees. Zero tilt.
Plate shape in output: a PERFECT CIRCLE — any ellipse means the angle is wrong.
Plate center: the exact geometric center of the image.
Plate diameter: EXACTLY 68% of the image width. Not 65%, not 72% — exactly 68%.
Margin on every side (top / bottom / left / right): EXACTLY 16%.

This is a MEASUREMENT RULE. Think of a fixed template:
  - Draw a circle centered in the frame.
  - That circle diameter = 68% of the image width.
  - The plate rim must align with this circle on every single image.
  - Small dish? Same circle size — show more background.
  - Large dish? Same circle size — scale down to fit inside it.
  - DO NOT zoom in or out to compensate for dish size.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 LIGHTING — LOCKED, IDENTICAL IN EVERY IMAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Single soft natural daylight source.
Position: top-left, 10 o'clock, 45-degree elevation above the surface.
Color temperature: warm, approximately 5000K.
Shadow: one soft shadow falling toward bottom-right of the plate.
Shadow softness: feathered edge, not harsh.
Shadow length: short, no longer than 15% of the plate radius.
No secondary light sources. No fill light. No bounce.
Highlights on food surface: soft specular, consistent intensity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌿 BACKGROUND — LOCKED SURFACE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Surface: Mediterranean fabric tablecloth — cotton or linen texture.
Base color: warm cream / beige (neutral light tone).
Pattern: subtle Mediterranean motif (soft stripes or delicate organic shapes).
Allowed palette: cream, beige, soft olive green, faded blue, light terracotta.
Texture: soft and flat — no heavy folds, no wrinkles, no raised edges.
Background fills the ENTIRE frame edge to edge. No layers, no depth.
No props. No cutlery. No hands. No restaurant environment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ DISH RULES — NO CHANGES TO THE FOOD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keep ALL ingredients exactly as in the input photo.
Do NOT add ingredients, sauces, garnishes, or props.
Do NOT remove any element.
Do NOT change the dish type, structure, or recipe.
The output must be instantly recognizable as the same dish.

Allowed enhancements (visual only):
- Make food look fresher, juicier, crispier
- Clean the plate rim (remove smudges or drips)
- Slightly brighten natural colors (no oversaturation)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Any zoom change between dishes
- Any background variation
- Any lighting direction change
- Bokeh, blur, or depth-of-field effects
- AI artifacts or plastic appearance
- Text, logos, watermarks
- Changing the dish identity

QUALITY: 4K, ultra-photorealistic, maximum sharpness.`;

    case 'studio':
      return `You are a professional food photographer producing images for a restaurant menu carousel.

═══════════════════════════════════════════════════════
⚠️  CAROUSEL SERIES — IDENTICAL FRAMING ACROSS ALL DISHES
═══════════════════════════════════════════════════════
These images will be placed side by side in an Instagram carousel.
The viewer swipes between dishes and must feel as if the camera NEVER MOVED.
The ONLY thing that changes between images is the food on the plate.
Everything else is physically fixed and cannot vary by a single pixel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FRAMING — ABSOLUTE FIXED RULE (NOT A GUIDELINE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Camera angle: perfectly perpendicular top-down, 90 degrees. Zero tilt.
Plate shape in output: a PERFECT CIRCLE — any ellipse means the angle is wrong.
Plate center: the exact geometric center of the image.
Plate diameter: EXACTLY 68% of the image width. Not 65%, not 72% — exactly 68%.
Margin on every side (top / bottom / left / right): EXACTLY 16%.

This is a MEASUREMENT RULE:
  - The plate rim must touch the same imaginary circle in EVERY image.
  - Small dish? Same circle — show more background.
  - Large dish? Same circle — scale down to fit.
  - DO NOT zoom in or out between dishes for any reason.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 LIGHTING — LOCKED, IDENTICAL IN EVERY IMAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Single directional studio strobe.
Position: top-left, exactly 10 o'clock, 45-degree elevation.
Highlight: sharp specular on food edges facing top-left.
Shadow: deep, falling toward bottom-right. Hard edge.
No fill light. No bounce card. No secondary source.
Shadow length: medium, consistent across all images.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖤 SURFACE — LOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Flat matte black surface, hex #1A1A1A.
Zero reflections. Zero texture. Perfectly uniform.
Surface fills the entire frame edge to edge.
No props. No cutlery. No gradients.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ DISH RULES — NO CHANGES TO THE FOOD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keep ALL original ingredients exactly as in the input photo.
Do NOT add or remove anything.
Enhance texture, freshness, and color contrast against the dark background.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Any zoom change between dishes
- Any background variation or surface change
- Any lighting angle or intensity change
- Bokeh, blur, or depth-of-field
- AI artifacts or plastic appearance
- Text, logos, watermarks

QUALITY: 4K, ultra-photorealistic, maximum sharpness, high contrast.`;

    case 'enhance':
      return `You are a professional food photographer producing images for a restaurant menu carousel.

═══════════════════════════════════════════════════════
⚠️  CAROUSEL SERIES — IDENTICAL FRAMING ACROSS ALL DISHES
═══════════════════════════════════════════════════════
These images will be placed side by side in an Instagram carousel.
The viewer swipes between dishes and must feel as if the camera NEVER MOVED.
The ONLY thing that changes between images is the food on the plate.
Everything else is physically fixed and cannot vary by a single pixel.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📐 FRAMING — ABSOLUTE FIXED RULE (NOT A GUIDELINE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Camera angle: perfectly perpendicular top-down, 90 degrees. Zero tilt.
Plate shape in output: a PERFECT CIRCLE — any ellipse means the angle is wrong.
Plate center: the exact geometric center of the image.
Plate diameter: EXACTLY 68% of the image width. Not 65%, not 72% — exactly 68%.
Margin on every side (top / bottom / left / right): EXACTLY 16%.

This is a MEASUREMENT RULE:
  - The plate rim must touch the same imaginary circle in EVERY image.
  - Small dish? Same circle — show more background.
  - Large dish? Same circle — scale down to fit.
  - DO NOT zoom in or out between dishes for any reason.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 LIGHTING — LOCKED, IDENTICAL IN EVERY IMAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Soft, perfectly even overhead diffused light from directly above.
Completely uniform illumination across the entire frame.
Zero directional shadows. Zero hotspots. Zero color cast.
Color temperature: neutral daylight, approximately 5500K.
The light must appear identical in brightness and tone on every image.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤍 SURFACE — LOCKED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pure white marble surface, hex #F8F8F8.
Very subtle uniform light-grey veining. Flat and clean.
Surface fills the entire frame edge to edge.
No props. No cutlery. No gradients.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🍽️ DISH RULES — NO CHANGES TO THE FOOD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Preserve ALL original ingredients exactly as in the input photo.
Do NOT add or remove anything.
Clean the plate rim (remove smudges or drips).
Slightly enhance freshness and natural color accuracy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 ABSOLUTELY FORBIDDEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Any zoom change between dishes
- Any background variation or surface change
- Any lighting variation (direction, intensity, color)
- Bokeh, blur, or depth-of-field
- AI artifacts or plastic appearance
- Text, logos, watermarks

QUALITY: 4K, ultra-photorealistic, maximum sharpness, clean minimal output.`;

    default:
      return getPresetPrompt(styleKey) ?? '';
  }
}
