import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

const ADMIN_PHONE = '0507676706';

async function isAdmin(req: NextRequest): Promise<boolean> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  return user?.phone === ADMIN_PHONE;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const { canSingleGenerate, canMultiGenerate } = await req.json();
  const user = await prisma.user.update({
    where: { id },
    data: { canSingleGenerate, canMultiGenerate },
    select: { id: true, canSingleGenerate: true, canMultiGenerate: true },
  });
  return NextResponse.json({ user });
}
