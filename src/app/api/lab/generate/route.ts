import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getPresetPrompt, getMenuSeriesPrompt } from '@/lib/style-presets';
import { FIXED_PROMPT } from '@/lib/prompt-engine';

import OpenAI from 'openai';

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

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { referenceImage: reqReferenceImage, dishName, styleKey, styleRefImage, dishId: rawDishId, customNote } = await req.json();
    const dishId = rawDishId ? String(rawDishId) : null;

    // Fall back to stored reference image if none provided (used for "regenerate" flow)
    let referenceImage = reqReferenceImage;
    if (!referenceImage && dishId) {
      const existing = await prisma.dish.findUnique({ where: { id: dishId }, select: { referenceImage: true } });
      referenceImage = existing?.referenceImage ?? null;
    }

    if (!referenceImage) return NextResponse.json({ success: false, error: 'referenceImage required' }, { status: 400 });
    if (!dishName?.trim()) return NextResponse.json({ success: false, error: 'dishName required' }, { status: 400 });

    const settings = await getSettings();

    // Find or create the "מעבדה" menu for this user
    let labMenu = await prisma.menu.findFirst({
      where: { userId, styleKey: `lab_${styleKey || 'default'}` },
    });
    if (!labMenu) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { restaurantName: true } });
      labMenu = await prisma.menu.create({
        data: {
          userId,
          name: user?.restaurantName ? `מעבדה – ${user.restaurantName}` : 'מעבדה',
          styleKey: `lab_${styleKey || 'default'}`,
          rawText: '',
        },
      });
    }

    // Get prompt
    let prompt: string;
    if (styleKey === 'custom' && styleRefImage) {
      // Analyze style reference image with GPT-4o vision
      const llmKey = settings.openaiApiKey || process.env.OPENAI_API_KEY || '';
      const openai = new OpenAI({ apiKey: llmKey });
      const analysis = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a professional food photography director. Analyze this reference photo and describe its photography style in precise technical terms so an AI image generator can replicate it exactly.\n\nDescribe: camera angle, lighting style and direction, background type and color, composition framing, depth of field, color grading/mood, surface/props, and any unique stylistic elements.\n\nReturn ONLY a concise photography style directive (2-4 sentences), starting with "Photography style:" — no extra commentary.`,
            },
            {
              type: 'image_url',
              image_url: { url: styleRefImage, detail: 'low' },
            },
          ],
        }],
        max_tokens: 300,
      });
      const styleDescription = analysis.choices[0]?.message?.content ?? '';
      prompt = `${styleDescription}\n\nApply this exact photography style to the dish from the reference image. Preserve ALL original ingredients, plating, and dish structure without any changes. DO NOT add or remove any food elements. Output a photorealistic, commercial-quality food photograph.`;
    } else if (dishId && styleKey) {
      // Generating from menu — use locked series prompt for consistency
      const base = getMenuSeriesPrompt(styleKey);
      prompt = customNote?.trim()
        ? `${base}\n\n---\n\n# SPECIAL USER REQUEST (apply if possible, locked parameters take priority):\n${customNote.trim()}`
        : base;
    } else {
      prompt = (styleKey && getPresetPrompt(styleKey)) || FIXED_PROMPT;
    }

    // Save dish with GENERATING status, fire background worker
    let savedDishId: string;
    if (dishId) {
      savedDishId = dishId;
      await prisma.dish.update({
        where: { id: dishId },
        data: { status: 'GENERATING', referenceImage, prompt, errorMessage: null },
      });
    } else {
      const dish = await prisma.dish.create({
        data: {
          menuId: labMenu.id,
          name: dishName.trim(),
          description: null,
          price: null,
          category: 'other',
          ingredients: '[]',
          prompt,
          status: 'GENERATING',
          referenceImage,
        },
      });
      savedDishId = dish.id;
    }

    // Fire background generation — returns immediately
    fireBg(savedDishId, referenceImage, prompt);

    return NextResponse.json({ success: true, data: { dishId: String(savedDishId), status: 'GENERATING' } });
  } catch (err) {
    console.error('[lab/generate]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
