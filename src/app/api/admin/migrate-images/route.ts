import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '@/lib/auth';
import { uploadDataUrlAsIs, isStorageConfigured, isStorageUrl } from '@/lib/storage';

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

  // Process one item at a time and stop well before the gateway timeout,
  // returning partial progress. The client calls repeatedly until done.
  // Bytes are uploaded as-is (no sharp), so each upload is fast.
  const TIME_BUDGET_MS = 8_000;
  const start = Date.now();
  const maxItems = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 6, 20);

  let migrated = 0;
  const errors: string[] = [];

  async function migrateOneDish(): Promise<boolean> {
    const d = await prisma.dish.findFirst({
      where: { imageUrl: { startsWith: 'data:' } },
      select: { id: true, imageUrl: true },
    });
    if (!d) return false;
    try {
      const url = await uploadDataUrlAsIs(d.imageUrl!);
      if (!isStorageUrl(url)) { errors.push(`dish ${d.id}: upload failed`); return false; }
      await prisma.dish.update({ where: { id: d.id }, data: { imageUrl: url! } });
      migrated++;
    } catch (err) {
      errors.push(`dish ${d.id}: ${String(err)}`);
      return false;
    }
    return true;
  }

  async function migrateOneDishImage(): Promise<boolean> {
    const di = await prisma.dishImage.findFirst({
      where: { imageUrl: { startsWith: 'data:' } },
      select: { id: true, imageUrl: true },
    });
    if (!di) return false;
    try {
      const url = await uploadDataUrlAsIs(di.imageUrl);
      if (!isStorageUrl(url)) { errors.push(`dishImage ${di.id}: upload failed`); return false; }
      await prisma.dishImage.update({ where: { id: di.id }, data: { imageUrl: url! } });
      migrated++;
    } catch (err) {
      errors.push(`dishImage ${di.id}: ${String(err)}`);
      return false;
    }
    return true;
  }

  let dishesDone = false;
  let dishImagesDone = false;
  // Migrate Dish rows first, then DishImage rows. Stop on time/count budget or
  // on the first failure (so we don't spin on a poison row).
  for (let i = 0; i < maxItems && Date.now() - start < TIME_BUDGET_MS; i++) {
    if (!dishesDone) {
      const ok = await migrateOneDish();
      if (ok) continue;
      dishesDone = true; // none left (or a failure) — move on to dish-images
    }
    const ok = await migrateOneDishImage();
    if (!ok) { dishImagesDone = true; break; }
  }

  // Cheap "is there more?" probe — avoids scanning/COUNTing the whole table.
  const [moreDish, moreDishImage] = await Promise.all([
    dishesDone ? prisma.dish.findFirst({ where: { imageUrl: { startsWith: 'data:' } }, select: { id: true } }) : Promise.resolve(true),
    dishImagesDone ? prisma.dishImage.findFirst({ where: { imageUrl: { startsWith: 'data:' } }, select: { id: true } }) : Promise.resolve(true),
  ]);
  const hasMore = Boolean(moreDish) || Boolean(moreDishImage);

  return NextResponse.json({ migrated, hasMore, errors });
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
