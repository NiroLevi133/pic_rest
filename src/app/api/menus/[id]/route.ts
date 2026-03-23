import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, styleKey } = await req.json();

    const menu = await prisma.menu.findFirst({ where: { id: params.id, userId } });
    if (!menu) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const updated = await prisma.menu.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(styleKey !== undefined && { styleKey: styleKey || null }),
      },
    });

    return NextResponse.json({ success: true, data: { id: updated.id, name: updated.name, styleKey: updated.styleKey } });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const menu = await prisma.menu.findFirst({ where: { id: params.id, userId } });
    if (!menu) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.menu.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
