import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresetPrompt } from '@/lib/style-presets';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';

function fireBg(dishId: string): void {
  const url = process.env.LAMBDA_GENERATE_URL;
  const secret = process.env.BG_SECRET || '';
  if (!url) { console.error('[fireBg] LAMBDA_GENERATE_URL not set'); return; }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bg-secret': secret },
    body: JSON.stringify({ dishId }),
  }).catch((err) => console.error('[fireBg] invoke failed', err));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dishId = params.id;

  try {
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      include: { menu: { include: { user: true } } },
    });
    if (!dish) return NextResponse.json({ success: false, error: 'Dish not found' }, { status: 404 });

    if (!dish.referenceImage) {
      return NextResponse.json(
        { success: false, error: 'נדרשת תמונת מקור – העלה תמונה של המנה קודם' },
        { status: 400 }
      );
    }

    // Build prompt: menu styleKey → user restaurantStyle (art director) → fixed fallback
    const menuStyleKey = dish.menu.styleKey?.trim();
    const userStyle = dish.menu.user.restaurantStyle?.trim();
    let prompt = FIXED_PROMPT;

    if (menuStyleKey) {
      const presetPrompt = getPresetPrompt(menuStyleKey);
      if (presetPrompt) {
        prompt = presetPrompt;
      }
    } else if (userStyle) {
      const settings = await import('@/lib/settings').then(m => m.getSettings());
      if (settings.openaiApiKey) {
        try {
          const ingredients: string[] = (() => {
            try { return JSON.parse(dish.ingredients); } catch { return []; }
          })();
          prompt = await generateDynamicPrompt(userStyle, dish.name, ingredients, settings.openaiApiKey);
        } catch {
          // fall through to FIXED_PROMPT
        }
      }
    }

    // Save prompt, set GENERATING, fire background worker
    await prisma.dish.update({
      where: { id: dishId },
      data: { status: 'GENERATING', prompt, errorMessage: null, retryCount: 0 },
    });

    fireBg(dishId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
