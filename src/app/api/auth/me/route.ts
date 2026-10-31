import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  // The owner is sent to the first-run business setup until it's completed.
  let setupRequired = false;
  if (user.role === 'OWNER') {
    const profile = await prisma.businessProfile.findUnique({ where: { id: 'main' }, select: { setupCompletedAt: true } });
    setupRequired = !profile?.setupCompletedAt;
  }

  return NextResponse.json({
    success: true,
    data: { userId: user.id, phone: user.phone, role: user.role, restaurantName: user.restaurantName ?? null, setupRequired },
  });
}
