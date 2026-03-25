import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { getPresetPrompt } from '@/lib/style-presets';
import type { GenerateAllRequest } from '@/lib/types';

function getBgBaseUrl(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('host') || 'localhost:3000';
  return process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`;
}

// Sets dish to GENERATING with correct prompt, fires background worker
async function queueDish(
  dishId: number,
  restaurantStyle: string | null,
  openaiApiKey: string | undefined,
  baseUrl: string,
): Promise<void> {
  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish || !dish.referenceImage) return;

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

  await prisma.dish.update({
    where: { id: dishId },
    data: { status: 'GENERATING', prompt, errorMessage: null },
  });

  const secret = process.env.BG_SECRET || 'restorante-internal';
  fetch(`${baseUrl}/api/generate-bg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bg-secret': secret },
    body: JSON.stringify({ dishId }),
  }).catch(() => {});
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
    const restaurantStyle = menu?.styleKey?.trim() || menu?.user.restaurantStyle?.trim() || null;

    const dishes = await prisma.dish.findMany({
      where: { menuId, referenceImage: { not: null }, status: { in: ['PENDING', 'ERROR'] } },
      select: { id: true },
    });

    if (dishes.length === 0) {
      return NextResponse.json({ success: true, data: { queued: 0, message: 'אין מנות עם תמונות מקור להגנרציה' } });
    }

    const baseUrl = getBgBaseUrl(req);

    // Each queueDish call is fast (DB update + HTTP fire) — await the whole batch
    await batchProcess(
      dishes,
      concurrency,
      (d) => queueDish(d.id, restaurantStyle, settings.openaiApiKey, baseUrl),
    );

    return NextResponse.json({ success: true, data: { queued: dishes.length } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
