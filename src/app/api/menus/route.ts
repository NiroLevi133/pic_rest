import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch menus + dish metadata WITHOUT heavy base64 fields
    const menus = await prisma.menu.findMany({
      where: { userId, NOT: { styleKey: { startsWith: 'lab_' } } },
      orderBy: { createdAt: 'desc' },
      include: {
        dishes: {
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Lightweight second query: just IDs of dishes that have images / references
    const allDishIds = menus.flatMap(m => m.dishes.map(d => d.id));
    const [withImage, withRef] = allDishIds.length > 0
      ? await Promise.all([
          prisma.dish.findMany({ where: { id: { in: allDishIds }, imageUrl: { not: null } }, select: { id: true } }),
          prisma.dish.findMany({ where: { id: { in: allDishIds }, referenceImage: { not: null } }, select: { id: true } }),
        ])
      : [[], []];

    const imageSet = new Set(withImage.map(d => d.id));
    const refSet   = new Set(withRef.map(d => d.id));

    const data = menus.map((m) => ({
      id: m.id,
      name: m.name,
      styleKey: m.styleKey ?? null,
      createdAt: m.createdAt.toISOString(),
      dishes: m.dishes.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        hasImage: imageSet.has(d.id),
        hasReference: refSet.has(d.id),
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, styleKey } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });

    const menu = await prisma.menu.create({
      data: { userId, name: name.trim(), styleKey: styleKey || null, rawText: '' },
    });

    return NextResponse.json({ success: true, data: { id: menu.id, name: menu.name, styleKey: menu.styleKey, createdAt: menu.createdAt.toISOString(), dishes: [] } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
