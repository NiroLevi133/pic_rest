import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { getPreset } from '@/lib/style-presets';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const menus = await prisma.menu.findMany({
    where: { userId },
    include: {
      dishes: {
        where: { status: 'DONE', imageUrl: { not: null } },
        orderBy: { updatedAt: 'desc' },
        // Do NOT select imageUrl (base64) — served separately via /api/images/[id]
        select: { id: true, name: true, category: true, price: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Build flat list of images, grouped by style
  const groups: Record<string, {
    styleKey: string;
    styleLabel: string;
    styleEmoji: string;
    dishes: {
      id: string;
      name: string;
      category: string;
      price: string | null;
      imageUrl: string;
      menuName: string;
      menuId: string;
      updatedAt: string;
    }[];
  }> = {};

  for (const menu of menus) {
    const key = menu.styleKey || 'default';
    const preset = menu.styleKey ? getPreset(menu.styleKey) : null;

    if (!groups[key]) {
      groups[key] = {
        styleKey: key,
        styleLabel: preset?.label ?? 'ברירת מחדל',
        styleEmoji: preset?.emoji ?? '🍽️',
        dishes: [],
      };
    }

    for (const dish of menu.dishes) {
      const imageUrl = `/api/images/${dish.id}`;
      groups[key].dishes.push({
        id: String(dish.id),
        name: dish.name,
        category: dish.category,
        price: dish.price,
        imageUrl,
        menuName: menu.name,
        menuId: menu.id,
        updatedAt: dish.updatedAt.toISOString(),
      });
    }
  }

  // Remove empty groups
  const result = Object.values(groups).filter(g => g.dishes.length > 0);

  return NextResponse.json({ success: true, data: { groups: result } });
}
