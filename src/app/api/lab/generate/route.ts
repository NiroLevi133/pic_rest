import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300; // 5 minutes
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { getImageProvider } from '@/lib/providers';
import { getPresetPrompt, getMenuSeriesPrompt } from '@/lib/style-presets';
import { FIXED_PROMPT } from '@/lib/prompt-engine';
import { resizeForGallery } from '@/lib/image-resize';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { referenceImage: reqReferenceImage, dishName, styleKey, styleRefImage, dishId, customNote } = await req.json();

    // Fall back to stored reference image if none provided (used for "regenerate" flow)
    let referenceImage = reqReferenceImage;
    if (!referenceImage && dishId) {
      const existing = await prisma.dish.findUnique({ where: { id: dishId }, select: { referenceImage: true } });
      referenceImage = existing?.referenceImage ?? null;
    }

    if (!referenceImage) return NextResponse.json({ success: false, error: 'referenceImage required' }, { status: 400 });
    if (!dishName?.trim()) return NextResponse.json({ success: false, error: 'dishName required' }, { status: 400 });

    const settings = await getSettings();
    const provider = getImageProvider(settings);

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
              text: `You are a professional food photography director. Analyze this reference photo and describe its photography style in precise technical terms so an AI image generator can replicate it exactly.

Describe: camera angle, lighting style and direction, background type and color, composition framing, depth of field, color grading/mood, surface/props, and any unique stylistic elements.

Return ONLY a concise photography style directive (2-4 sentences), starting with "Photography style:" — no extra commentary.`,
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
      prompt = `${styleDescription}

Apply this exact photography style to the dish from the reference image. Preserve ALL original ingredients, plating, and dish structure without any changes. DO NOT add or remove any food elements. Output a photorealistic, commercial-quality food photograph.`;
    } else if (dishId && styleKey) {
      // Generating from menu — use locked series prompt for consistency
      const base = getMenuSeriesPrompt(styleKey);
      prompt = customNote?.trim()
        ? `${base}\n\n---\n\n# SPECIAL USER REQUEST (apply if possible, locked parameters take priority):\n${customNote.trim()}`
        : base;
    } else {
      prompt = (styleKey && getPresetPrompt(styleKey)) || FIXED_PROMPT;
    }

    // Generate image
    const result = await provider.generate({
      prompt,
      size: settings.imageSize,
      quality: settings.imageQuality,
      referenceImage,
    });

    // Compress large base64 images before saving to DB (speeds up gallery loading)
    let storedImageUrl = result.imageUrl;
    if (storedImageUrl.startsWith('data:') && storedImageUrl.length > 150_000) {
      try { storedImageUrl = await resizeForGallery(storedImageUrl); } catch { /* fallback to original */ }
    }

    // If dishId provided, update the existing dish (from menus page); otherwise create a new lab dish
    let savedDishId: string;
    if (dishId) {
      await prisma.dish.update({
        where: { id: dishId },
        data: { status: 'DONE', imageUrl: storedImageUrl, referenceImage },
      });
      savedDishId = dishId;
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
          status: 'DONE',
          imageUrl: storedImageUrl,
          referenceImage,
        },
      });
      savedDishId = dish.id;
    }

    // Save to DishImage history table
    const dishImage = await prisma.dishImage.create({
      data: { dishId: savedDishId, imageUrl: storedImageUrl },
    });

    return NextResponse.json({ success: true, data: { imageUrl: `/api/images/${savedDishId}`, dishId: savedDishId, dishImageId: dishImage.id } });
  } catch (err) {
    console.error('[lab/generate]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
