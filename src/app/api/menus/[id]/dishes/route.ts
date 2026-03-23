import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { FIXED_PROMPT } from '@/lib/prompt-engine';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ success: false, error: 'name required' }, { status: 400 });

    const menu = await prisma.menu.findFirst({ where: { id: params.id, userId } });
    if (!menu) return NextResponse.json({ success: false, error: 'Menu not found' }, { status: 404 });

    const dish = await prisma.dish.create({
      data: {
        menuId: params.id,
        name: name.trim(),
        category: 'other',
        ingredients: '[]',
        prompt: FIXED_PROMPT,
        status: 'PENDING',
      },
      select: { id: true, name: true, status: true, imageUrl: true, referenceImage: true },
    });

    return NextResponse.json({
      success: true,
      data: { id: dish.id, name: dish.name, status: dish.status, imageUrl: dish.imageUrl, hasReference: !!dish.referenceImage },
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
