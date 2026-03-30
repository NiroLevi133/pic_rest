import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getPresetPrompt, getMenuSeriesPrompt } from '@/lib/style-presets';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { getImageProvider } from '@/lib/providers';
import { resizeForGallery } from '@/lib/image-resize';

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
    body: JSON.stringify({ dishId, referenceImage, prompt, callbackUrl }),
  }).catch((err) => console.error('[fireBg] invoke failed', err));
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { referenceImage: reqReferenceImage, dishName, styleKey, styleRefImage, dishId: rawDishId, customNote, advancedOptions, captionOverlay } = await req.json();
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

    // Append advanced options to prompt
    if (advancedOptions) {
      const mods: string[] = [];
      if (advancedOptions.angle === 'side') mods.push('Shoot from a direct side angle, eye-level perspective.');
      if (advancedOptions.hands)       mods.push('Include elegant hands presenting or holding the dish with expressive, graceful gestures.');
      if (advancedOptions.action)      mods.push('Dynamic action shot: ingredients dramatically falling or being sprinkled onto the dish mid-air, freeze-frame moment.');
      if (advancedOptions.preparation) mods.push("Show a chef's hands actively plating the dish — pouring sauce or adding final touches in a professional kitchen.");
      if (advancedOptions.festive)     mods.push('Add a festive, celebratory atmosphere with subtle warm bokeh and decorative elements.');
      if (advancedOptions.showPrice)   mods.push('Display the dish price elegantly in the corner of the image.');
      if (mods.length > 0) prompt += `\n\n# ADVANCED DIRECTIVES:\n${mods.map(m => `- ${m}`).join('\n')}`;
    }

    // Append caption overlay directive
    if (captionOverlay?.enabled && captionOverlay.text?.trim()) {
      const text = captionOverlay.text.trim();
      const captionDirectives: Record<string, string> = {
        elegant:   `Render the text "${text}" as an elegant caption on the image. Use a thin white serif font with generous letter-spacing. Position at the bottom center. Add a very subtle dark gradient at the bottom (10% opacity) only where needed for readability. Keep it refined, minimal, and high-end.`,
        lifestyle: `Render the text "${text}" as a warm handwritten-style caption on the image. Use a natural script/cursive font in white or soft cream. Position organically at the bottom or lower-third area. It should feel like an authentic Instagram food influencer's overlay — casual but tasteful.`,
        bold:      `Render the text "${text}" as a bold modern caption on the image. Use a thick, clean sans-serif font in solid white. High contrast. Position at the bottom center with strong visual impact. Clean, commercial, advertising-grade typography.`,
      };
      const directive = captionDirectives[captionOverlay.style] ?? captionDirectives.elegant;
      prompt += `\n\n# TEXT CAPTION (render directly on the image):\n${directive}`;
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

    // If Lambda is configured — fire-and-forget (async worker)
    if (process.env.LAMBDA_GENERATE_URL) {
      fireBg(savedDishId, referenceImage, prompt);
      return NextResponse.json({ success: true, data: { dishId: String(savedDishId), status: 'GENERATING' } });
    }

    // No Lambda — generate directly in this request (synchronous fallback)
    try {
      const imageProvider = getImageProvider(settings);
      const result = await imageProvider.generate({ prompt, referenceImage });
      const compressed = await resizeForGallery(result.imageUrl);
      await prisma.dish.update({
        where: { id: savedDishId },
        data: { status: 'DONE', imageUrl: compressed, errorMessage: null },
      });
      // Also create a DishImage record for history
      await prisma.dishImage.create({ data: { dishId: savedDishId, imageUrl: compressed } });
    } catch (genErr) {
      await prisma.dish.update({
        where: { id: savedDishId },
        data: { status: 'ERROR', errorMessage: String(genErr) },
      });
    }

    return NextResponse.json({ success: true, data: { dishId: String(savedDishId), status: 'GENERATING' } });
  } catch (err) {
    console.error('[lab/generate]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
