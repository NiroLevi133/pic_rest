import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const [user, menus] = await Promise.all([
      prisma.user.findUnique({
        where: { id: params.userId },
        select: { restaurantName: true, restaurantLogo: true, restaurantStyle: true },
      }),
      prisma.menu.findMany({
        where: { userId: params.userId, NOT: { styleKey: { startsWith: 'lab_' } } },
        orderBy: { createdAt: 'asc' },
        include: {
          dishes: {
            select: { id: true, name: true, description: true, price: true, status: true, ingredients: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    if (!user) return NextResponse.json({ success: false, error: 'לא נמצא' }, { status: 404 });

    return NextResponse.json({
      success: true,
      data: {
        restaurantName: user.restaurantName ?? 'המסעדה שלי',
        restaurantLogo: user.restaurantLogo ?? null,
        restaurantStyle: user.restaurantStyle ?? null,
        menus: menus.map(m => ({
          id: m.id,
          name: m.name,
          dishes: m.dishes.map(d => ({
            id: d.id,
            name: d.name,
            description: d.description ?? null,
            price: d.price ?? null,
            hasImage: d.status === 'DONE',
            ingredients: (() => {
              try { const p = JSON.parse(d.ingredients); return Array.isArray(p) ? p.filter(Boolean) : []; }
              catch { return []; }
            })(),
          })),
        })).filter(m => m.dishes.length > 0),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
