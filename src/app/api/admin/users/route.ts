import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

async function isAdmin(req: NextRequest): Promise<boolean> {
  return (await getSessionUser(req))?.role === 'OWNER';
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    select: {
      id: true,
      phone: true,
      restaurantName: true,
      canSingleGenerate: true,
      canMultiGenerate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ users });
}
