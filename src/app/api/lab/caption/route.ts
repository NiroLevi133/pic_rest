import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getLLMProvider } from '@/lib/providers';
import { STYLE_PRESETS } from '@/lib/style-presets';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { dishName, styleKey, ingredients } = await req.json() as {
      dishName: string;
      styleKey?: string;
      ingredients?: string[];
    };

    if (!dishName?.trim()) {
      return NextResponse.json({ success: false, error: 'dishName required' }, { status: 400 });
    }

    const settings = await getSettings();
    const provider = getLLMProvider(settings);

    const preset = STYLE_PRESETS.find(p => p.key === styleKey);
    const styleDescription = preset
      ? `${preset.label} — ${preset.description}`
      : 'צילום מקצועי של מנה';

    const ingredientsList = ingredients?.length
      ? `רכיבים: ${ingredients.join(', ')}.`
      : '';

    const systemPrompt = `אתה כותב כיתובים לאינסטגרם לעסקים בענף המסעדנות. הכיתובים שלך:
- כתובים בעברית תקינה ומושכת
- מתאימים לסגנון הצילום שבו הצולם
- מכילים אמוג'י רלוונטיים
- כוללים 3-5 האשטאגים בעברית בסוף
- קצרים וקליטים (3-5 שורות)
- לא מאוד שיווקיים — אלא אותנטיים ומזמינים`;

    const userPrompt = `כתוב כיתוב לאינסטגרם עבור המנה: "${dishName}".
${ingredientsList}
סגנון הצילום: ${styleDescription}.
כתוב בעברית. הכיתוב צריך להתאים לסגנון ולהלהיב את הקוראים.`;

    const caption = await provider.complete({
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 300,
    });

    return NextResponse.json({ success: true, data: { caption: caption.trim() } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
