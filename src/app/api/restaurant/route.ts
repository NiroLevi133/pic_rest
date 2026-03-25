import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const [user, menus] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { restaurantName: true, restaurantLogo: true, restaurantStyle: true },
      }),
      prisma.menu.findMany({
        where: { userId, NOT: { styleKey: { startsWith: 'lab_' } } },
        orderBy: { createdAt: 'asc' },
        include: {
          dishes: {
            select: { id: true, name: true, description: true, price: true, status: true, ingredients: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        restaurantName: user?.restaurantName ?? 'המסעדה שלי',
        restaurantLogo: user?.restaurantLogo ?? null,
        restaurantStyle: user?.restaurantStyle ?? null,
        menus: menus.map(m => ({
          id: m.id,
          name: m.name,
          dishes: m.dishes.map(d => ({
            id: String(d.id),
            name: d.name,
            description: d.description ?? null,
            price: d.price ?? null,
            hasImage: d.status === 'DONE',
            ingredients: (() => { try { const p = JSON.parse(d.ingredients); return Array.isArray(p) ? p.filter(Boolean) : []; } catch { return []; } })(),
          })),
        })),
      },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
