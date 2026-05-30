import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { persistImage, isStorageConfigured, isStorageUrl } from '@/lib/storage';

export const maxDuration = 300;

const ADMIN_PHONE = '0507676706';

async function isAdmin(req: NextRequest): Promise<boolean> {
  const userId = getUserIdFromRequest(req);
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
  return user?.phone === ADMIN_PHONE;
}

/**
 * One-off (idempotent) migration: move base64 images out of Postgres and into
 * Supabase Storage. Processes a batch per call — keep calling until
 * `remaining` is 0. Safe to re-run.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: 'Storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' }, { status: 500 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 25, 100);

  let migratedDishes = 0;
  let migratedDishImages = 0;
  const errors: string[] = [];

  // Dish.imageUrl
  const dishes = await prisma.dish.findMany({
    where: { imageUrl: { startsWith: 'data:' } },
    select: { id: true, imageUrl: true },
    take: limit,
  });
  for (const d of dishes) {
    try {
      const url = await persistImage(d.imageUrl!);
      // persistImage degrades to base64 on upload failure — don't write that
      // back (it would leave the row un-migrated and loop forever).
      if (!isStorageUrl(url)) { errors.push(`dish ${d.id}: upload failed`); continue; }
      await prisma.dish.update({ where: { id: d.id }, data: { imageUrl: url } });
      migratedDishes++;
    } catch (err) {
      errors.push(`dish ${d.id}: ${String(err)}`);
    }
  }

  // DishImage.imageUrl
  const dishImages = await prisma.dishImage.findMany({
    where: { imageUrl: { startsWith: 'data:' } },
    select: { id: true, imageUrl: true },
    take: limit,
  });
  for (const di of dishImages) {
    try {
      const url = await persistImage(di.imageUrl);
      if (!isStorageUrl(url)) { errors.push(`dishImage ${di.id}: upload failed`); continue; }
      await prisma.dishImage.update({ where: { id: di.id }, data: { imageUrl: url } });
      migratedDishImages++;
    } catch (err) {
      errors.push(`dishImage ${di.id}: ${String(err)}`);
    }
  }

  const [remainingDishes, remainingDishImages] = await Promise.all([
    prisma.dish.count({ where: { imageUrl: { startsWith: 'data:' } } }),
    prisma.dishImage.count({ where: { imageUrl: { startsWith: 'data:' } } }),
  ]);

  return NextResponse.json({
    migratedDishes,
    migratedDishImages,
    remaining: remainingDishes + remainingDishImages,
    remainingDishes,
    remainingDishImages,
    errors,
  });
}

/** Quick status check: how many rows still hold base64. */
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const [remainingDishes, remainingDishImages] = await Promise.all([
    prisma.dish.count({ where: { imageUrl: { startsWith: 'data:' } } }),
    prisma.dishImage.count({ where: { imageUrl: { startsWith: 'data:' } } }),
  ]);
  return NextResponse.json({
    storageConfigured: isStorageConfigured(),
    remaining: remainingDishes + remainingDishImages,
    remainingDishes,
    remainingDishImages,
  });
}
