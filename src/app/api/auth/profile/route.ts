import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true, restaurantName: true, restaurantLogo: true, restaurantStyle: true,
      restaurantUrl: true, restaurantDescription: true, restaurantTheme: true, createdAt: true,
    },
  });
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const generatedCount = await prisma.dish.count({ where: { menu: { userId }, status: 'DONE' } });

  return NextResponse.json({ success: true, data: {
    phone: user.phone,
    restaurantName: user.restaurantName ?? '',
    restaurantLogo: user.restaurantLogo ?? null,
    restaurantStyle: user.restaurantStyle ?? '',
    restaurantUrl: user.restaurantUrl ?? '',
    restaurantDescription: user.restaurantDescription ?? '',
    restaurantTheme: user.restaurantTheme ?? null,
    generatedCount,
    createdAt: user.createdAt.toISOString(),
  }});
}

export async function PUT(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ success: false, error: 'Not logged in' }, { status: 401 });

  const body = await req.json() as {
    restaurantName?: string; restaurantLogo?: string | null;
    restaurantStyle?: string; restaurantUrl?: string; restaurantDescription?: string;
  };

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(body.restaurantName !== undefined && { restaurantName: body.restaurantName || null }),
      ...(body.restaurantLogo !== undefined && { restaurantLogo: body.restaurantLogo || null }),
      ...(body.restaurantStyle !== undefined && { restaurantStyle: body.restaurantStyle || null }),
      ...(body.restaurantUrl !== undefined && { restaurantUrl: body.restaurantUrl || null }),
      ...(body.restaurantDescription !== undefined && { restaurantDescription: body.restaurantDescription || null }),
    },
    select: {
      restaurantName: true, restaurantLogo: true, restaurantStyle: true,
      restaurantUrl: true, restaurantDescription: true,
    },
  });

  return NextResponse.json({ success: true, data: {
    restaurantName: user.restaurantName ?? '',
    restaurantLogo: user.restaurantLogo ?? null,
    restaurantStyle: user.restaurantStyle ?? '',
    restaurantUrl: user.restaurantUrl ?? '',
    restaurantDescription: user.restaurantDescription ?? '',
  }});
}
