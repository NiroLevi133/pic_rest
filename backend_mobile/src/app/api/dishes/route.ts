import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import type { Dish } from '@/lib/types';

function mapDish(d: {
  id: string; menuId: string; name: string; description: string | null;
  price: string | null; category: string; ingredients: string; prompt: string;
  status: string; imageUrl: string | null; referenceImage?: string | null;
  errorMessage: string | null; retryCount: number; createdAt: Date; updatedAt: Date;
}): Dish {
  return {
    ...d,
    status: d.status as Dish['status'],
    ingredients: (() => { try { return JSON.parse(d.ingredients); } catch { return []; } })(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const menuId = req.nextUrl.searchParams.get('menuId');

  try {
    if (menuId) {
      // Verify this menu belongs to the user
      const menu = await prisma.menu.findFirst({
        where: { id: menuId, userId },
        include: { dishes: { orderBy: { createdAt: 'asc' } } },
      });
      if (!menu) return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });

      return NextResponse.json({
        success: true,
        data: {
          menuId: menu.id,
          menuName: menu.name,
          styleKey: menu.styleKey ?? null,
          dishes: menu.dishes.map(mapDish),
        },
      });
    }

    // List all menus for this user
    const menus = await prisma.menu.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { dishes: true } } },
    });

    return NextResponse.json({ success: true, data: menus });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
