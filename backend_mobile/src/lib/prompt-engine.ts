import type { ParsedDish } from './types';

export const FIXED_PROMPT = `Use the uploaded food image as the main reference.

Your task is to recreate this exact dish as a premium studio food photograph.

STRICT FOOD CONSISTENCY RULE:
The dish must remain exactly the same in identity and composition:
- all original components must be present
- do not remove any component
- do not add new ingredients
- do not change the type of food
- do not change the structure of the dish

ALLOWED IMPROVEMENTS (visual only):
- you may refine existing ingredients to look fresher and more premium
  (e.g. replace lettuce with fresher, crisp lettuce of the same type,
   improve sauce texture, enhance meat juiciness, sharpen textures)
- you may slightly clean and arrange the food for better presentation
- you may enhance colors naturally (not exaggerated)

FORBIDDEN:
- adding new ingredients that were not in the original image
- removing ingredients
- changing the filling or recipe
- transforming the dish into a different version

PLATING & STYLING:
- plate can be replaced with a more elegant, premium plate
- composition should be clean, balanced, and refined
- no messy look

PHOTOGRAPHY:
- Camera angle: TOP-DOWN (flat lay), perfect 90 degree angle
- Background: deep black seamless
- Lighting: warm directional light from the right side, soft shadows, subtle fill
- Mood: luxury restaurant, high-end commercial food photography

QUALITY:
- ultra-realistic
- 4K resolution
- extremely sharp details
- realistic textures (crispy, juicy, fresh)
- no artificial or AI-looking results

FINAL RULE:
This is the same dish - just styled, cleaned, and upgraded to a premium studio version.
Photorealistic only.`;

export function generatePrompt(_dish: ParsedDish): string {
  return FIXED_PROMPT;
}

export function generatePrompts(dishes: ParsedDish[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const dish of dishes) {
    result.set(dish.name, FIXED_PROMPT);
  }
  return result;
}
