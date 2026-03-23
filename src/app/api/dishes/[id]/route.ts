import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Dish } from '@/lib/types';

function mapDish(d: {
  id: string; menuId: string; name: string; description: string | null;
  price: string | null; category: string; ingredients: string; prompt: string;
  status: string; imageUrl: string | null; errorMessage: string | null;
  retryCount: number; createdAt: Date; updatedAt: Date;
}): Dish {
  return {
    ...d,
    status: d.status as Dish['status'],
    ingredients: (() => { try { return JSON.parse(d.ingredients); } catch { return []; } })(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { prompt } = await req.json() as { prompt?: string };
    if (!prompt) {
      return NextResponse.json({ success: false, error: 'prompt required' }, { status: 400 });
    }

    const dish = await prisma.dish.update({
      where: { id: params.id },
      data: { prompt },
    });

    return NextResponse.json({ success: true, data: mapDish(dish) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dish = await prisma.dish.findUnique({ where: { id: params.id } });
    if (!dish) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: mapDish(dish) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
