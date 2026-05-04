import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const { name, styleKey, qrCode } = await req.json();

    // Single query: update only if owned by this user
    const updated = await prisma.menu.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(styleKey !== undefined && { styleKey: styleKey || null }),
        ...(qrCode !== undefined && { qrCode: qrCode || null }),
      },
    });

    if (updated.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const result = await prisma.menu.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, styleKey: true },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    // Single query: delete only if owned by this user
    const deleted = await prisma.menu.deleteMany({ where: { id: params.id, userId } });
    if (deleted.count === 0) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
