import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  return NextResponse.json({ success: true, data: { userId: user.id, phone: user.phone, restaurantName: user.restaurantName ?? null } });
}
