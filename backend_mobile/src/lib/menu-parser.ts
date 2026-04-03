/**
 * Menu parser – converts raw menu text into structured ParsedDish objects.
 * Uses LLM when available; falls back to regex heuristics.
 */
import type { ParsedDish, DishCategory } from './types';
import { getLLMProvider } from './providers';
import { getSettings } from './settings';

// ─── LLM-based parsing ───────────────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `You are a menu parser assistant.
Given raw menu text, extract each dish/item and return a JSON array.
Each item must have: name, description (optional), price (optional), category, ingredients (array of strings).
Categories: starter, main, dessert, drink, cocktail, wine, beer, side, salad, soup, pizza, pasta, burger, seafood, meat, vegetarian, vegan, kids, breakfast, other.
Detect language automatically. Extract ingredients from description when possible.
Return ONLY valid JSON array, no markdown, no explanation.`;

export async function parseMenuWithLLM(menuText: string): Promise<ParsedDish[]> {
  const settings = await getSettings();
  const provider = getLLMProvider(settings);

  const response = await provider.complete({
    system: PARSE_SYSTEM_PROMPT,
    user: `Parse this menu:\n\n${menuText}`,
    maxTokens: 4096,
  });

  const json = extractJSON(response);
  return json as ParsedDish[];
}

// ─── Heuristic parsing fallback ──────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<DishCategory, string[]> = {
  starter:     ['פתיח', 'מנה ראשונה', 'appetizer', 'starter', 'antipasto'],
  soup:        ['מרק', 'soup', 'bisque', 'consommé'],
  salad:       ['סלט', 'salad', 'insalata'],
  main:        ['עיקרית', 'מנה עיקרית', 'main', 'entree', 'plat principal'],
  pizza:       ['פיצה', 'pizza', 'pizze'],
  pasta:       ['פסטה', 'pasta', 'spaghetti', 'penne', 'fettuccine', 'linguine', 'rigatoni'],
  burger:      ['המבורגר', 'burger', 'smash'],
  seafood:     ['דגים', 'ים', 'fish', 'seafood', 'shrimp', 'salmon', 'tuna', 'לוקוס', 'דניס'],
  meat:        ['בשר', 'סטייק', 'meat', 'steak', 'beef', 'lamb', 'chicken', 'pork', 'עוף', 'כבש'],
  vegetarian:  ['צמחוני', 'vegetarian', 'veggie'],
  vegan:       ['טבעוני', 'vegan'],
  side:        ['תוספת', 'צד', 'side', 'contorno'],
  dessert:     ['קינוח', 'מתוק', 'dessert', 'dolce', 'sweet', 'cake', 'עוגה', 'גלידה'],
  drink:       ['שתייה', 'משקה', 'drink', 'beverage', 'juice', 'מיץ', 'מים'],
  cocktail:    ['קוקטייל', 'cocktail', 'mojito', 'martini', 'margarita'],
  wine:        ['יין', 'wine', 'vino'],
  beer:        ['בירה', 'beer', 'ale', 'lager', 'stout'],
  kids:        ['ילדים', 'kids', 'children', 'bambini'],
  breakfast:   ['ארוחת בוקר', 'breakfast', 'brunch', 'colazione'],
  other:       [],
};

function detectCategory(text: string): DishCategory {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return cat as DishCategory;
    }
  }
  return 'other';
}

function extractIngredients(description: string): string[] {
  if (!description) return [];
  // Split by common separators and clean up
  const parts = description.split(/[,،،;\/\|]+/);
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 1 && p.length < 40);
}

export function parseMenuHeuristic(menuText: string): ParsedDish[] {
  const lines = menuText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dishes: ParsedDish[] = [];
  let currentCategory: DishCategory = 'other';

  for (const line of lines) {
    // Check if line is a section header (all caps, or ends with :, or short line)
    const isSectionHeader =
      /^[A-Z\u05D0-\u05EA\s]{3,30}:?\s*$/.test(line) ||
      (line.length < 30 && !line.includes('₪') && !line.match(/\d+\.?\d*\s*[₪$€£]/));

    if (isSectionHeader) {
      const detectedCat = detectCategory(line);
      if (detectedCat !== 'other') currentCategory = detectedCat;
      continue;
    }

    // Try to parse: "Name - Description  ₪price" or "Name  price"
    const priceMatch = line.match(/(.+?)\s+(\d+\.?\d*)\s*[₪$€£]?\s*$/);
    const dashSplit = line.split(/\s*[-–—]\s*/);

    if (dashSplit.length >= 2) {
      const name = dashSplit[0].trim();
      const rest = dashSplit.slice(1).join(' - ').trim();
      const innerPrice = rest.match(/(\d+\.?\d*)\s*[₪$€£]?\s*$/);
      const description = innerPrice
        ? rest.slice(0, innerPrice.index).trim()
        : rest;
      const price = innerPrice ? innerPrice[1] : undefined;

      dishes.push({
        name,
        description: description || undefined,
        price,
        category: detectCategory(name + ' ' + description),
        ingredients: extractIngredients(description),
      });
    } else if (priceMatch) {
      const name = priceMatch[1].trim();
      dishes.push({
        name,
        price: priceMatch[2],
        category: currentCategory,
        ingredients: [],
      });
    } else if (line.length > 2 && line.length < 80) {
      dishes.push({
        name: line,
        category: currentCategory,
        ingredients: [],
      });
    }
  }

  return dishes.filter((d) => d.name.length > 1);
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function parseMenu(menuText: string): Promise<ParsedDish[]> {
  try {
    return await parseMenuWithLLM(menuText);
  } catch (err) {
    console.warn('[menu-parser] LLM parsing failed, falling back to heuristic:', err);
    return parseMenuHeuristic(menuText);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractJSON(text: string): unknown[] {
  // Try to find JSON array in the response
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in response');
  return JSON.parse(match[0]);
}
