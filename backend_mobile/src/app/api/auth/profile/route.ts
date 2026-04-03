import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { menus: true } } },
  });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  // Count total generated images
  const generatedCount = await prisma.dish.count({
    where: { menu: { userId }, status: 'DONE' },
  });

  return NextResponse.json({ success: true, data: {
    phone: user.phone,
    restaurantName: user.restaurantName ?? '',
    restaurantLogo: user.restaurantLogo ?? null,
    restaurantStyle: user.restaurantStyle ?? '',
    generatedCount,
    createdAt: user.createdAt.toISOString(),
  }});
}

export async function PUT(req: NextRequest) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const body = await req.json();
  const { restaurantName, restaurantLogo, restaurantStyle } = body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(restaurantName !== undefined && { restaurantName: restaurantName || null }),
      ...(restaurantLogo !== undefined && { restaurantLogo: restaurantLogo || null }),
      ...(restaurantStyle !== undefined && { restaurantStyle: restaurantStyle || null }),
    },
  });

  return NextResponse.json({ success: true, data: {
    restaurantName: user.restaurantName ?? '',
    restaurantLogo: user.restaurantLogo ?? null,
    restaurantStyle: user.restaurantStyle ?? '',
  }});
}
