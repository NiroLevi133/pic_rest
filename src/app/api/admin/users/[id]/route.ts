import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

async function isAdmin(req: NextRequest): Promise<boolean> {
  return (await getSessionUser(req))?.role === 'OWNER';
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
