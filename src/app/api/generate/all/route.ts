import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { getImageProvider } from '@/lib/providers';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { getPresetPrompt } from '@/lib/style-presets';
import type { GenerateAllRequest } from '@/lib/types';

async function generateDish(
  dishId: string,
  restaurantStyle: string | null,
  openaiApiKey: string | undefined
): Promise<void> {
  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish || !dish.referenceImage) return;

  await prisma.dish.update({
    where: { id: dishId },
    data: { status: 'GENERATING', errorMessage: null },
  });

  const settings = await getSettings();
  const provider = getImageProvider(settings);

  // Build prompt: preset → art director → fixed fallback
  let prompt = FIXED_PROMPT;
  if (restaurantStyle) {
    const presetPrompt = getPresetPrompt(restaurantStyle);
    if (presetPrompt) {
      prompt = presetPrompt;
    } else if (openaiApiKey) {
      try {
        const ingredients: string[] = (() => {
          try { return JSON.parse(dish.ingredients); } catch { return []; }
        })();
        prompt = await generateDynamicPrompt(restaurantStyle, dish.name, ingredients, openaiApiKey);
      } catch {
        prompt = FIXED_PROMPT;
      }
    }
  }

  try {
    const result = await provider.generate({
      prompt,
      size: settings.imageSize,
      quality: settings.imageQuality,
      referenceImage: dish.referenceImage,
    });

    await prisma.dish.update({
      where: { id: dishId },
      data: { status: 'DONE', imageUrl: result.imageUrl, prompt, errorMessage: null },
    });
  } catch (err) {
    await prisma.dish.update({
      where: { id: dishId },
      data: {
        status: 'ERROR',
        errorMessage: err instanceof Error ? err.message : String(err),
        retryCount: { increment: 1 },
      },
    });
  }
}

async function batchProcess<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.allSettled(items.slice(i, i + batchSize).map(fn));
  }
}

export async function POST(req: NextRequest) {
  try {
    const { menuId } = await req.json() as GenerateAllRequest;
    if (!menuId) return NextResponse.json({ success: false, error: 'menuId required' }, { status: 400 });

    const settings = await getSettings();
    const concurrency = settings.concurrency ?? 2;

    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      include: { user: true },
    });
    // Prefer menu's styleKey, fallback to user's restaurantStyle
    const restaurantStyle = menu?.styleKey?.trim() || menu?.user.restaurantStyle?.trim() || null;

    const dishes = await prisma.dish.findMany({
      where: { menuId, referenceImage: { not: null }, status: { in: ['PENDING', 'ERROR'] } },
      select: { id: true },
    });

    if (dishes.length === 0) {
      return NextResponse.json({ success: true, data: { queued: 0, message: 'אין מנות עם תמונות מקור להגנרציה' } });
    }

    batchProcess(
      dishes,
      concurrency,
      (d) => generateDish(d.id, restaurantStyle, settings.openaiApiKey)
    ).catch(console.error);

    return NextResponse.json({ success: true, data: { queued: dishes.length } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
