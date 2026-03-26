import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPresetPrompt } from '@/lib/style-presets';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';

function fireBg(dishId: string, referenceImage: string, prompt: string): void {
  const url = process.env.LAMBDA_GENERATE_URL;
  const appUrl = process.env.APP_URL || '';
  const secret = process.env.BG_SECRET || '';
  if (!url) { console.error('[fireBg] LAMBDA_GENERATE_URL not set'); return; }
  const callbackUrl = `${appUrl}/api/generate-callback`;
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bg-secret': secret },
    body: JSON.stringify({ dishId, referenceImage, prompt, callbackUrl, secret }),
  }).catch((err) => console.error('[fireBg] invoke failed', err));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const dishId = params.id;
  console.log('[POST /api/generate/[id]] entered');
  console.log('[POST /api/generate/[id]] dishId =', dishId);

  try {
    const dish = await prisma.dish.findUnique({
      where: { id: dishId },
      include: { menu: { include: { user: true } } },
    });

    console.log('[POST] dish found =', !!dish);

    if (!dish) {
      console.error('[POST] dish not found');
      return NextResponse.json(
        { success: false, error: 'Dish not found' },
        { status: 404 }
      );
    }

    console.log('[POST] has referenceImage =', !!dish.referenceImage);

    if (!dish.referenceImage) {
      console.error('[POST] missing reference image');
      return NextResponse.json(
        { success: false, error: 'נדרשת תמונת מקור – העלה תמונה של המנה קודם' },
        { status: 400 }
      );
    }

    const menuStyleKey = dish.menu.styleKey?.trim();
    const userStyle = dish.menu.user.restaurantStyle?.trim();
    let prompt = FIXED_PROMPT;

    console.log('[POST] menuStyleKey =', menuStyleKey || '(empty)');
    console.log('[POST] userStyle =', userStyle || '(empty)');

    if (menuStyleKey) {
      const presetPrompt = getPresetPrompt(menuStyleKey);
      if (presetPrompt) {
        prompt = presetPrompt;
        console.log('[POST] using preset prompt');
      }
    } else if (userStyle) {
      const settings = await import('@/lib/settings').then(m => m.getSettings());
      console.log('[POST] openaiApiKey exists =', !!settings.openaiApiKey);

      if (settings.openaiApiKey) {
        try {
          const ingredients: string[] = (() => {
            try {
              return JSON.parse(dish.ingredients);
            } catch {
              return [];
            }
          })();

          console.log('[POST] ingredients count =', ingredients.length);

          prompt = await generateDynamicPrompt(
            userStyle,
            dish.name,
            ingredients,
            settings.openaiApiKey
          );

          console.log('[POST] using dynamic prompt');
        } catch (e) {
          console.error('[POST] generateDynamicPrompt failed =', e);
        }
      }
    }

    await prisma.dish.update({
      where: { id: dishId },
      data: {
        status: 'GENERATING',
        prompt,
        errorMessage: null,
        retryCount: 0,
      },
    });

    console.log('[POST] dish updated to GENERATING');
    console.log('[POST] calling fireBg');

    fireBg(dishId, dish.referenceImage, prompt);

    console.log('[POST] returning success');
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST] failed =', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}