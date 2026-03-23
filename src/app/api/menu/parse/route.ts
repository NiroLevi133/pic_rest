import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseMenu } from '@/lib/menu-parser';
import { generatePrompt } from '@/lib/prompt-engine';
import { getUserIdFromRequest } from '@/lib/auth';
import type { ParseMenuRequest } from '@/lib/types';

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { menuText, styleKey } = await req.json() as ParseMenuRequest & { styleKey?: string };

    if (!menuText?.trim()) {
      return NextResponse.json({ success: false, error: 'menuText is required' }, { status: 400 });
    }

    const parsedDishes = await parseMenu(menuText);

    if (parsedDishes.length === 0) {
      return NextResponse.json({ success: false, error: 'לא נמצאו מנות בתפריט' }, { status: 400 });
    }

    // Use restaurant name from user profile
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { restaurantName: true } });
    const menuName = user?.restaurantName || 'תפריט';

    const menu = await prisma.menu.create({
      data: {
        userId,
        name: menuName,
        styleKey: styleKey || null,
        rawText: menuText,
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
    console.error('[parse]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
