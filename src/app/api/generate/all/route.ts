import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { generateDynamicPrompt } from '@/lib/art-director';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { getPresetPrompt } from '@/lib/style-presets';
import type { GenerateAllRequest } from '@/lib/types';

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

async function buildPrompt(
  dish: { id: string; name: string; ingredients: string },
  restaurantStyle: string | null,
  openaiApiKey: string | undefined,
): Promise<string> {
  if (!restaurantStyle) return FIXED_PROMPT;
  const presetPrompt = getPresetPrompt(restaurantStyle);
  if (presetPrompt) return presetPrompt;
  if (!openaiApiKey) return FIXED_PROMPT;
  try {
    const ingredients: string[] = (() => { try { return JSON.parse(dish.ingredients); } catch { return []; } })();
    return await generateDynamicPrompt(restaurantStyle, dish.name, ingredients, openaiApiKey);
  } catch {
    return FIXED_PROMPT;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { menuId } = await req.json() as GenerateAllRequest;
    if (!menuId) return NextResponse.json({ success: false, error: 'menuId required' }, { status: 400 });

    // Fetch settings + menu + dishes in parallel
    const [settings, menu, dishes] = await Promise.all([
      getSettings(),
      prisma.menu.findUnique({
        where: { id: menuId },
        select: { styleKey: true, user: { select: { restaurantStyle: true } } },
      }),
      prisma.dish.findMany({
        where: { menuId, referenceImage: { not: null }, status: { in: ['PENDING', 'ERROR'] } },
        select: { id: true, name: true, ingredients: true, referenceImage: true },
      }),
    ]);

    if (dishes.length === 0) {
      return NextResponse.json({ success: true, data: { queued: 0, message: 'אין מנות עם תמונות מקור להגנרציה' } });
    }

    const restaurantStyle = menu?.styleKey?.trim() || menu?.user.restaurantStyle?.trim() || null;
    const concurrency = settings.concurrency ?? 2;

    // Build all prompts in parallel (batched to avoid OpenAI rate limits)
    const promptResults: string[] = new Array(dishes.length).fill(FIXED_PROMPT);
    for (let i = 0; i < dishes.length; i += concurrency) {
      const batch = dishes.slice(i, i + concurrency);
      const prompts = await Promise.allSettled(
        batch.map(d => buildPrompt(d, restaurantStyle, settings.openaiApiKey))
      );
      prompts.forEach((r, j) => {
        if (r.status === 'fulfilled') promptResults[i + j] = r.value;
      });
    }

    // Batch-update all dishes to GENERATING in one transaction
    await prisma.$transaction(
      dishes.map((d, i) =>
        prisma.dish.update({
          where: { id: d.id },
          data: { status: 'GENERATING', prompt: promptResults[i], errorMessage: null },
        })
      )
    );

    // Fire all background workers (non-blocking)
    dishes.forEach((d, i) => {
      if (d.referenceImage) fireBg(d.id, d.referenceImage, promptResults[i]);
    });

    return NextResponse.json({ success: true, data: { queued: dishes.length } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
