import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { menuId: string } }) {
  try {
    const menu = await prisma.menu.findUnique({
      where: { id: params.menuId },
      include: {
        user: { select: { restaurantName: true, restaurantLogo: true, restaurantStyle: true } },
        dishes: {
          select: { id: true, name: true, description: true, price: true, status: true, ingredients: true, category: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!menu) return NextResponse.json({ success: false, error: 'לא נמצא' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        id: menu.id,
        name: menu.name,
        restaurantName: menu.user?.restaurantName ?? 'המסעדה שלי',
        restaurantLogo: menu.user?.restaurantLogo ?? null,
        restaurantStyle: menu.user?.restaurantStyle ?? null,
        dishes: menu.dishes.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description ?? null,
          price: d.price ?? null,
          hasImage: d.status === 'DONE',
          category: d.category,
          ingredients: (() => {
            try { const p = JSON.parse(d.ingredients); return Array.isArray(p) ? p.filter(Boolean) : []; }
            catch { return []; }
          })(),
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
