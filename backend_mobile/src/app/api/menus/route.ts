import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // Single query: menus + dishes + image history (no extra queries needed)
    // hasImage / hasReference are derived from status === 'DONE' (always set together with imageUrl/referenceImage)
    const menus = await prisma.menu.findMany({
      where: { userId, NOT: { styleKey: { startsWith: 'lab_' } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        styleKey: true,
        createdAt: true,
        dishes: {
          select: {
            id: true,
            name: true,
            status: true,
            referenceImage: true,
            images: {
              select: { id: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const data = menus.map((m) => ({
      id: m.id,
      name: m.name,
      styleKey: m.styleKey ?? null,
      createdAt: m.createdAt.toISOString(),
      dishes: m.dishes.map((d) => ({
        id: String(d.id),
        name: d.name,
        status: d.status,
        hasImage: d.status === 'DONE',
        hasReference: !!d.referenceImage,
        imageIds: d.images.map(i => i.id),
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
