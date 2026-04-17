import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMenu } from '@/lib/menu-parser';
import { generatePrompt } from '@/lib/prompt-engine';
import { getUserIdFromRequest } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { menuImage, styleKey } = await req.json();

    if (!menuImage) {
      return NextResponse.json({ success: false, error: 'menuImage is required' }, { status: 400 });
    }

    // Extract menu text from image using GPT-4o vision
    const settings = await getSettings();
    if (!settings.openaiApiKey) {
      return NextResponse.json({ success: false, error: 'נדרש OpenAI API key בהגדרות' }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: settings.openaiApiKey });

    const visionRes = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract the menu items from this restaurant menu image.
Return a plain text list of menu items in this exact format (one per line):
Dish name - description (if any) - price (if visible)

Only list the food/drink items, no categories, no headers, no extra text.
If there is Hebrew text, keep it in Hebrew.`,
            },
            {
              type: 'image_url',
              image_url: { url: menuImage, detail: 'high' },
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = visionRes.choices[0]?.message?.content ?? '';
    if (!extractedText.trim()) {
      return NextResponse.json({ success: false, error: 'לא הצלחתי לקרוא מנות מהתמונה' }, { status: 400 });
    }

    // Parse extracted text into structured dishes
    const parsedDishes = await parseMenu(extractedText);
    if (parsedDishes.length === 0) {
      return NextResponse.json({ success: false, error: 'לא נמצאו מנות בתפריט' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { restaurantName: true } });
    const menuName = user?.restaurantName || 'תפריט';

    const menu = await prisma.menu.create({
      data: {
        userId,
        name: menuName,
        styleKey: styleKey || null,
        rawText: extractedText,
        dishes: {
          create: parsedDishes.map((dish) => ({
            name: dish.name,
            description: dish.description ?? null,
            price: dish.price != null ? String(dish.price) : null,
            category: dish.category,
            ingredients: JSON.stringify(dish.ingredients ?? []),
            prompt: generatePrompt(dish),
            status: 'PENDING',
          })),
        },
      },
      include: { dishes: true },
    });

    return NextResponse.json({
      success: true,
      data: { menuId: menu.id, dishCount: menu.dishes.length },
    });
  } catch (err) {
    console.error('[parse-image]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
