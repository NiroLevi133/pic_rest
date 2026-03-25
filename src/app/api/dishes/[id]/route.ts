import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import type { Dish } from '@/lib/types';

function mapDish(d: {
  id: number; menuId: string; name: string; description: string | null;
  price: string | null; category: string; ingredients: string; prompt: string;
  status: string; imageUrl: string | null; errorMessage: string | null;
  retryCount: number; createdAt: Date; updatedAt: Date;
}): Dish {
  return {
    ...d,
    id: String(d.id),
    status: d.status as Dish['status'],
    ingredients: (() => { try { return JSON.parse(d.ingredients); } catch { return []; } })(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dish = await prisma.dish.findUnique({ where: { id: parseInt(params.id) } });
    if (!dish) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: mapDish(dish) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json() as { prompt?: string; name?: string; ingredients?: string[] };
    const updateData: Record<string, unknown> = {};
    if (body.prompt !== undefined) updateData.prompt = body.prompt;
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.ingredients !== undefined) updateData.ingredients = JSON.stringify(body.ingredients);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }

    const dish = await prisma.dish.update({ where: { id: parseInt(params.id) }, data: updateData });
    return NextResponse.json({ success: true, data: mapDish(dish) });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const dish = await prisma.dish.findFirst({
      where: { id: parseInt(params.id), menu: { userId } },
    });
    if (!dish) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    await prisma.dish.delete({ where: { id: parseInt(params.id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
