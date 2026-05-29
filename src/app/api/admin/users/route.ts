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
