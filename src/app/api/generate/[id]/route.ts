import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getImageProvider } from '@/lib/providers';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { getPresetPrompt } from '@/lib/style-presets';

function mapDish(d: {
  id: number; menuId: string; name: string; description: string | null;
  price: string | null; category: string; ingredients: string; prompt: string;
  status: string; imageUrl: string | null; referenceImage?: string | null;
  errorMessage: string | null; retryCount: number; createdAt: Date; updatedAt: Date;
}) {
  return {
    ...d,
    id: String(d.id),
    ingredients: (() => { try { return JSON.parse(d.ingredients); } catch { return []; } })(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dishId = parseInt(params.id);

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

    await prisma.dish.update({
      where: { id: dishId },
      data: { status: 'GENERATING', errorMessage: null, retryCount: 0 },
    });

    const settings = await getSettings();
    const provider = getImageProvider(settings);

    // Build prompt: menu styleKey → user restaurantStyle (art director) → fixed fallback
    const menuStyleKey = dish.menu.styleKey?.trim();
    const userStyle = dish.menu.user.restaurantStyle?.trim();
    let prompt = FIXED_PROMPT;

    if (menuStyleKey) {
      const presetPrompt = getPresetPrompt(menuStyleKey);
      if (presetPrompt) {
        prompt = presetPrompt;
        console.log('[generate] using menu preset:', menuStyleKey);
      }
    } else if (userStyle && settings.openaiApiKey) {
      try {
        const ingredients: string[] = (() => {
          try { return JSON.parse(dish.ingredients); } catch { return []; }
        })();
        prompt = await generateDynamicPrompt(userStyle, dish.name, ingredients, settings.openaiApiKey);
        console.log('[art-director] generated prompt for', dish.name);
      } catch (artErr) {
        console.warn('[art-director] fallback to FIXED_PROMPT:', artErr);
      }
    }

    try {
      const result = await provider.generate({
        prompt,
        size: settings.imageSize,
        quality: settings.imageQuality,
        referenceImage: dish.referenceImage,
      });

      const updated = await prisma.dish.update({
        where: { id: dishId },
        data: { status: 'DONE', imageUrl: result.imageUrl, prompt, errorMessage: null },
      });

      return NextResponse.json({ success: true, data: mapDish(updated) });

    } catch (genErr) {
      const errorMessage = genErr instanceof Error ? genErr.message : String(genErr);
      console.error('[generate]', dishId, errorMessage);

      const updated = await prisma.dish.update({
        where: { id: dishId },
        data: { status: 'ERROR', errorMessage, retryCount: { increment: 1 } },
      });

      return NextResponse.json({ success: false, error: errorMessage, data: mapDish(updated) }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
